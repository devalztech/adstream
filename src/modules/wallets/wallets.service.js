const { query, withTransaction } = require('../../db/pool');
const ApiError = require('../../utils/ApiError');

async function getWallet(userId) {
  const result = await query('SELECT id, balance, currency, created_at FROM wallets WHERE user_id = $1', [
    userId,
  ]);
  if (result.rows.length === 0) throw ApiError.notFound('Wallet not found');
  return result.rows[0];
}

async function getTransactions(userId, { limit = 20, offset = 0 } = {}) {
  const wallet = await getWallet(userId);
  const result = await query(
    `SELECT id, type, amount, balance_after, reference, status, description, created_at
     FROM transactions
     WHERE wallet_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [wallet.id, limit, offset]
  );
  return result.rows;
}

/**
 * The single point through which every wallet balance change must flow —
 * deposits, withdrawals, campaign spend, publisher earnings, refunds,
 * and admin adjustments all call this rather than UPDATE-ing wallets
 * directly. Runs inside a transaction with a row lock so concurrent
 * spends can't race past the non-negative balance check.
 *
 * type: 'deposit' | 'withdrawal' | 'campaign_spend' | 'publisher_earning' | 'refund' | 'adjustment'
 * amount: positive to credit, negative to debit (in smallest currency unit)
 */
async function recordTransaction(userId, { type, amount, reference = null, description = null, metadata = null }) {
  return withTransaction(async (client) => {
    const walletResult = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    if (walletResult.rows.length === 0) throw ApiError.notFound('Wallet not found');

    const wallet = walletResult.rows[0];
    const newBalance = wallet.balance + amount;

    if (newBalance < 0) {
      throw ApiError.badRequest('Insufficient wallet balance for this transaction');
    }

    const txResult = await client.query(
      `INSERT INTO transactions (wallet_id, type, amount, balance_after, reference, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, type, amount, balance_after, created_at`,
      [wallet.id, type, amount, newBalance, reference, description, metadata]
    );

    await client.query('UPDATE wallets SET balance = $1, updated_at = now() WHERE id = $2', [
      newBalance,
      wallet.id,
    ]);

    return txResult.rows[0];
  });
}

module.exports = { getWallet, getTransactions, recordTransaction };
