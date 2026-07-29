const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Access tokens are short-lived JWTs carrying { sub, role }, verified
 * on every request via the auth middleware — nothing DB-backed, fast.
 */
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/**
 * Refresh tokens are opaque random strings, not JWTs — the raw value is
 * given to the client, only its SHA-256 hash is stored in `sessions`,
 * so a DB leak alone can't be used to forge sessions.
 */
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Same opaque-token pattern for email verification / password reset links.
 */
function generateVerificationToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  hashToken,
};
