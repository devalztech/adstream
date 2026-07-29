const { pool } = require('../src/db/pool');

/**
 * Truncates every app table between tests, in FK-safe order, so
 * integration tests don't leak state into each other. RESTART IDENTITY
 * isn't needed since every table uses UUIDs, not serial ids — only
 * `roles` uses a SMALLSERIAL, and it's seeded data we deliberately keep.
 */
async function resetDatabase() {
  await pool.query(`
    TRUNCATE TABLE
      conversions, clicks, impressions,
      notifications, audit_logs,
      withdrawal_requests, transactions, wallets,
      campaign_creatives, campaigns,
      ad_units, websites,
      verification_tokens, sessions,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function closeDatabase() {
  await pool.end();
}

/**
 * True if the configured DATABASE_URL is actually reachable. Integration
 * test files call this once (see canRunIntegrationTests below) and skip
 * their whole describe block if it's false, rather than failing with a
 * wall of connection-refused errors when no test DB is set up yet.
 */
async function isDatabaseReachable() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = { resetDatabase, closeDatabase, isDatabaseReachable, pool };
