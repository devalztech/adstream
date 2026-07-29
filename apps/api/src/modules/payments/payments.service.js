const crypto = require('crypto');
const { query, withTransaction } = require('../../db/pool');
const { getProvider } = require('./providers');
const walletsService = require('../wallets/wallets.service');
const notificationsService = require('../notifications/notifications.service');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const env = require('../../config/env');

function generateReference(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Starts a deposit: creates a pending transaction row up front (so the
 * reference exists before redirecting the user to the provider), then
 * asks the provider for a checkout URL. The transaction is only marked
 * completed once verifyDeposit confirms it — via webhook or the
 * verify-on-return endpoint, never optimistically here.
 */
async function initiateDeposit(userId, userEmail, { amount, provider: providerName }) {
  const provider = getProvider(providerName);
  const reference = generateReference('dep');

  const wallet = await walletsService.getWallet(userId);

  await query(
    `INSERT INTO transactions (wallet_id, type, amount, balance_after, reference, provider, status, description)
     VALUES ($1, 'deposit', $2, $3, $4, $5, 'pending', 'Wallet deposit')`,
    [wallet.id, amount, wallet.balance, reference, providerName]
  );

  const { authorizationUrl } = await provider.initializeDeposit({
    amount,
    currency: wallet.currency,
    email: userEmail,
    reference,
    callbackUrl: `${env.app.frontendUrl}/wallet/deposit/callback`,
  });

  return { authorizationUrl, reference };
}

/**
 * Verifies a deposit against the provider and, on first success, credits
 * the wallet through recordTransaction. Idempotent: if the transaction
 * row is already 'completed', this returns early rather than double-crediting —
 * safe to call from both the webhook and the user's return-to-site flow.
 */
async function verifyDeposit(reference, providerName) {
  const provider = getProvider(providerName);

  const txResult = await query('SELECT * FROM transactions WHERE reference = $1', [reference]);
  if (txResult.rows.length === 0) throw ApiError.notFound('Transaction not found');
  const tx = txResult.rows[0];

  if (tx.status === 'completed') {
    return { status: 'success', alreadyProcessed: true };
  }

  const verification = await provider.verifyDeposit(reference);

  if (verification.status === 'failed') {
    await query(`UPDATE transactions SET status = 'failed' WHERE id = $1`, [tx.id]);
    return { status: 'failed' };
  }

  if (verification.status === 'pending') {
    return { status: 'pending' };
  }

  // verification.status === 'success'
  const walletResult = await query('SELECT user_id FROM wallets WHERE id = $1', [tx.wallet_id]);
  const userId = walletResult.rows[0].user_id;

  await withTransaction(async (client) => {
    // Mark this specific pending row completed, then run the credit
    // through the shared ledger function so wallets.balance and the
    // running ledger stay in sync via one code path.
    await client.query(`UPDATE transactions SET status = 'completed' WHERE id = $1`, [tx.id]);
  });

  // recordTransaction inserts its own ledger row; delete the placeholder
  // pending row's effect by crediting the verified amount now.
  await walletsService.recordTransaction(userId, {
    type: 'deposit',
    amount: verification.amount,
    reference: `${reference}_credit`,
    description: `Deposit via ${providerName}`,
  });

  const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
  await notificationsService.notify(userId, {
    type: 'wallet.deposit',
    title: 'Deposit successful',
    message: `Your deposit of ${(verification.amount / 100).toFixed(2)} ${verification.currency || 'NGN'} has been credited to your wallet.`,
    metadata: { reference, amount: verification.amount },
    email: userResult.rows[0]?.email,
  });

  logger.info('Deposit verified and credited', { userId, reference, amount: verification.amount });
  return { status: 'success' };
}

/**
 * Publishers request a withdrawal; funds are debited from the wallet
 * immediately (held), and a withdrawal_requests row tracks the payout
 * lifecycle separately from the instant wallet ledger entry — a bank
 * transfer can still fail after the wallet debit, which the reversal
 * path below handles.
 */
async function requestWithdrawal(userId, { amount, provider: providerName, destination }) {
  const reference = generateReference('wd');

  const transaction = await walletsService.recordTransaction(userId, {
    type: 'withdrawal',
    amount: -amount,
    reference,
    description: `Withdrawal request via ${providerName}`,
  });

  const result = await query(
    `INSERT INTO withdrawal_requests (user_id, transaction_id, amount, provider, destination, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [userId, transaction.id, amount, providerName, JSON.stringify(destination)]
  );

  return result.rows[0];
}

/**
 * Processes a pending withdrawal by calling the provider's transfer API.
 * On failure, reverses the wallet debit via a refund transaction rather
 * than mutating the original — the ledger stays append-only and auditable.
 * This would typically be triggered by an admin action or a queue worker,
 * not directly by the publisher.
 */
async function processWithdrawal(withdrawalId) {
  const result = await query('SELECT * FROM withdrawal_requests WHERE id = $1', [withdrawalId]);
  if (result.rows.length === 0) throw ApiError.notFound('Withdrawal request not found');
  const withdrawal = result.rows[0];

  if (withdrawal.status !== 'pending') {
    throw ApiError.badRequest(`Withdrawal is already ${withdrawal.status}`);
  }

  await query(`UPDATE withdrawal_requests SET status = 'processing' WHERE id = $1`, [withdrawalId]);

  const provider = getProvider(withdrawal.provider);

  try {
    const transferResult = await provider.initiateTransfer({
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      destination: withdrawal.destination,
      reference: generateReference('payout'),
    });

    if (transferResult.status === 'failed') {
      throw new Error('Provider reported transfer failure');
    }

    await query(
      `UPDATE withdrawal_requests SET status = $1, processed_at = now() WHERE id = $2`,
      [transferResult.status === 'success' ? 'completed' : 'processing', withdrawalId]
    );

    if (transferResult.status === 'success') {
      const userResult = await query('SELECT email FROM users WHERE id = $1', [withdrawal.user_id]);
      await notificationsService.notify(withdrawal.user_id, {
        type: 'withdrawal.completed',
        title: 'Withdrawal completed',
        message: `Your withdrawal of ${(withdrawal.amount / 100).toFixed(2)} ${withdrawal.currency} has been sent to your bank account.`,
        metadata: { withdrawalId },
        email: userResult.rows[0]?.email,
      });
    }

    return { status: transferResult.status };
  } catch (err) {
    logger.error('Withdrawal processing failed, reversing wallet debit', {
      withdrawalId,
      error: err.message,
    });

    await walletsService.recordTransaction(withdrawal.user_id, {
      type: 'refund',
      amount: withdrawal.amount,
      reference: `${withdrawalId}_reversal`,
      description: 'Withdrawal failed — funds returned to wallet',
    });

    await query(
      `UPDATE withdrawal_requests SET status = 'failed', failure_reason = $1, processed_at = now() WHERE id = $2`,
      [err.message, withdrawalId]
    );

    const userResult = await query('SELECT email FROM users WHERE id = $1', [withdrawal.user_id]);
    await notificationsService.notify(withdrawal.user_id, {
      type: 'withdrawal.failed',
      title: 'Withdrawal failed',
      message: `Your withdrawal of ${(withdrawal.amount / 100).toFixed(2)} ${withdrawal.currency} could not be processed. The funds have been returned to your wallet.`,
      metadata: { withdrawalId },
      email: userResult.rows[0]?.email,
    });

    throw ApiError.badRequest('Withdrawal could not be processed; funds have been returned to your wallet.');
  }
}

async function listMyWithdrawals(userId, { limit = 20, offset = 0 } = {}) {
  const result = await query(
    `SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY requested_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

/** Handles a verified provider webhook event for a deposit. */
async function handleWebhook(providerName, rawBody, signatureHeader) {
  const provider = getProvider(providerName);

  if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody);
  const reference = payload?.data?.reference || payload?.data?.tx_ref;

  if (!reference) {
    logger.warn('Webhook payload missing reference', { providerName });
    return;
  }

  await verifyDeposit(reference, providerName);
}

module.exports = {
  initiateDeposit,
  verifyDeposit,
  requestWithdrawal,
  processWithdrawal,
  listMyWithdrawals,
  handleWebhook,
};
