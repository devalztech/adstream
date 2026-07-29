const { Pool } = require('pg');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * SSL config for the DB connection.
 *
 * Render's own managed Postgres uses a self-signed cert with no CA to
 * verify against, so `rejectUnauthorized: false` is the normal way to
 * connect to it. Other providers — Aiven, Supabase, Neon, etc. — issue
 * a real CA certificate and expect the client to verify against it;
 * some of them reject connections that skip verification entirely.
 *
 * If DATABASE_CA_CERT is set (paste the full contents of the provider's
 * downloaded ca.pem into this env var), we verify against it properly.
 * Otherwise we fall back to the permissive mode for providers that
 * don't require/offer a CA cert.
 */
const sslConfig = !env.databaseSsl
  ? false
  : process.env.DATABASE_CA_CERT
    ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT }
    : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslConfig,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients — log, don't crash the process.
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

/**
 * Run a query using a pooled connection.
 * Every module goes through this instead of importing `pg` directly,
 * so query logging/metrics can be added in one place later.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn('Slow query', { text, duration });
  }
  return result;
}

/**
 * Run a set of queries inside a transaction.
 * Usage: await withTransaction(async (client) => { await client.query(...); });
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
