const request = require('supertest');
const app = require('../../src/app');
const walletsService = require('../../src/modules/wallets/wallets.service');
const { resetDatabase, closeDatabase, isDatabaseReachable, pool } = require('../helpers');

async function registerAndGetUserId(email) {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ fullName: 'Test User', email, password: 'password123', role: 'advertiser' });
  const userRow = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  return userRow.rows[0].id;
}

describe('wallet ledger (integration)', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseReachable();
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('\n[SKIPPED] Wallet integration tests: no reachable database. See tests/README.md.\n');
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await resetDatabase();
  });

  afterAll(async () => {
    if (dbAvailable) await closeDatabase();
  });

  const itIfDb = (name, fn) => it(name, async () => (dbAvailable ? fn() : undefined));

  itIfDb('starts every new user at a zero balance', async () => {
    const userId = await registerAndGetUserId('wallet-a@example.com');
    const wallet = await walletsService.getWallet(userId);
    expect(wallet.balance).toBe(0);
  });

  itIfDb('credits a deposit and updates balance_after correctly', async () => {
    const userId = await registerAndGetUserId('wallet-b@example.com');
    const tx = await walletsService.recordTransaction(userId, { type: 'deposit', amount: 5000 });

    expect(tx.balance_after).toBe(5000);
    const wallet = await walletsService.getWallet(userId);
    expect(wallet.balance).toBe(5000);
  });

  itIfDb('rejects a debit that would push the balance negative', async () => {
    const userId = await registerAndGetUserId('wallet-c@example.com');
    await walletsService.recordTransaction(userId, { type: 'deposit', amount: 1000 });

    await expect(
      walletsService.recordTransaction(userId, { type: 'campaign_spend', amount: -5000 })
    ).rejects.toThrow(/insufficient/i);

    // Balance must be unchanged after the rejected transaction.
    const wallet = await walletsService.getWallet(userId);
    expect(wallet.balance).toBe(1000);
  });

  itIfDb('never lets concurrent debits push the balance negative (row-lock correctness)', async () => {
    const userId = await registerAndGetUserId('wallet-d@example.com');
    await walletsService.recordTransaction(userId, { type: 'deposit', amount: 1000 });

    // Fire 10 concurrent debits of 200 each — only 5 can succeed against
    // a starting balance of 1000. Without FOR UPDATE locking in
    // recordTransaction, this kind of race can overdraw the wallet.
    const attempts = Array.from({ length: 10 }, (_, i) =>
      walletsService
        .recordTransaction(userId, { type: 'campaign_spend', amount: -200, reference: `race-${i}` })
        .then(() => 'ok')
        .catch(() => 'rejected')
    );

    const results = await Promise.all(attempts);
    const succeeded = results.filter((r) => r === 'ok').length;

    expect(succeeded).toBe(5);
    const wallet = await walletsService.getWallet(userId);
    expect(wallet.balance).toBe(0); // exactly drained, never negative
  });

  itIfDb('exposes deposits and debits via the transactions list, newest first', async () => {
    const userId = await registerAndGetUserId('wallet-e@example.com');
    await walletsService.recordTransaction(userId, { type: 'deposit', amount: 1000, reference: 'first' });
    await walletsService.recordTransaction(userId, { type: 'campaign_spend', amount: -300, reference: 'second' });

    const transactions = await walletsService.getTransactions(userId);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].reference).toBe('second'); // most recent first
    expect(transactions[1].reference).toBe('first');
  });
});
