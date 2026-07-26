const { query, withTransaction } = require('../../db/pool');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
  signAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  hashToken,
} = require('../../utils/tokens');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { sendEmail } = require('../notifications/email.provider');
const env = require('../../config/env');

const REFRESH_TOKEN_TTL_DAYS = 30;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

async function getRoleId(roleName) {
  const result = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
  if (result.rows.length === 0) throw ApiError.badRequest(`Unknown role: ${roleName}`);
  return result.rows[0].id;
}

/**
 * Registers a new advertiser or publisher. Creates the user + wallet
 * atomically, and issues an email-verification token.
 * Admin accounts are provisioned out-of-band, never through this endpoint.
 */
async function register({ fullName, email, password, role, companyName }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const roleId = await getRoleId(role);
  const passwordHash = await hashPassword(password);

  const user = await withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (role_id, email, password_hash, full_name, company_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, company_name, role_id, created_at`,
      [roleId, email, passwordHash, fullName, companyName || null]
    );
    const newUser = userResult.rows[0];

    // Every user gets exactly one wallet at creation time.
    await client.query('INSERT INTO wallets (user_id) VALUES ($1)', [newUser.id]);

    return newUser;
  });

  const { raw, hash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await query(
    `INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, 'email_verify', $3)`,
    [user.id, hash, expiresAt]
  );

  // Sends via the configured SMTP provider, or logs as a stub if SMTP
  // isn't configured yet (see email.provider.js) — either way, the
  // registration flow itself never fails because of an email problem.
  const verifyUrl = `${env.app.frontendUrl}/verify-email?token=${raw}`;
  sendEmail({
    to: user.email,
    subject: 'Verify your AdStream account',
    text: `Welcome to AdStream! Verify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  }).catch((err) => logger.warn('Verification email send failed', { userId: user.id, error: err.message }));

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role,
  };
}

async function login({ email, password }, context = {}) {
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active, u.is_locked,
            u.failed_login_attempts, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const user = result.rows[0];

  if (user.is_locked) {
    throw ApiError.forbidden('This account has been locked. Contact support.');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await query(
      `UPDATE users SET failed_login_attempts = $1, is_locked = $2 WHERE id = $3`,
      [attempts, shouldLock, user.id]
    );
    if (shouldLock) {
      throw ApiError.forbidden('Account locked due to too many failed login attempts.');
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  await query(
    `UPDATE users
     SET failed_login_attempts = 0, last_login_at = now(), last_login_ip = $1
     WHERE id = $2`,
    [context.ip || null, user.id]
  );

  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const { raw: refreshToken, hash: refreshHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, refreshHash, context.userAgent || null, context.ip || null, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
  };
}

/**
 * Rotates a refresh token: the old session is revoked and a new one issued.
 * Rotation (rather than reusing the same refresh token indefinitely) means
 * a stolen refresh token has a much smaller window of usefulness.
 */
async function refresh(refreshToken, context = {}) {
  const tokenHash = hashToken(refreshToken);

  const result = await query(
    `SELECT s.id AS session_id, s.user_id, s.expires_at, s.revoked_at, r.name AS role, u.email, u.full_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE s.refresh_token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const session = result.rows[0];

  if (session.revoked_at || new Date(session.expires_at) < new Date()) {
    throw ApiError.unauthorized('Refresh token expired or revoked');
  }

  await query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [session.session_id]);

  const accessToken = signAccessToken({ id: session.user_id, role: session.role });
  const { raw: newRefreshToken, hash: newHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [session.user_id, newHash, context.userAgent || null, context.ip || null, expiresAt]
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: session.user_id, email: session.email, fullName: session.full_name, role: session.role },
  };
}

async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await query('UPDATE sessions SET revoked_at = now() WHERE refresh_token_hash = $1', [tokenHash]);
}

async function verifyEmail(token) {
  const tokenHash = hashToken(token);

  const result = await query(
    `SELECT id, user_id, expires_at, consumed_at FROM verification_tokens
     WHERE token_hash = $1 AND purpose = 'email_verify'`,
    [tokenHash]
  );

  if (result.rows.length === 0) throw ApiError.badRequest('Invalid verification token');
  const record = result.rows[0];

  if (record.consumed_at) throw ApiError.badRequest('This token has already been used');
  if (new Date(record.expires_at) < new Date()) throw ApiError.badRequest('This token has expired');

  await withTransaction(async (client) => {
    await client.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [record.user_id]);
    await client.query('UPDATE verification_tokens SET consumed_at = now() WHERE id = $1', [record.id]);
  });
}

async function forgotPassword(email) {
  const result = await query('SELECT id FROM users WHERE email = $1', [email]);
  // Deliberately do not reveal whether the email exists — avoids
  // account enumeration via this endpoint.
  if (result.rows.length === 0) {
    logger.info('Password reset requested for unknown email', { email });
    return;
  }

  const userId = result.rows[0].id;
  const { raw, hash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await query(
    `INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, 'password_reset', $3)`,
    [userId, hash, expiresAt]
  );

  const resetUrl = `${env.app.frontendUrl}/reset-password?token=${raw}`;
  sendEmail({
    to: email,
    subject: 'Reset your AdStream password',
    text: `A password reset was requested for your account. Visit: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  }).catch((err) => logger.warn('Password reset email send failed', { userId, error: err.message }));
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);

  const result = await query(
    `SELECT id, user_id, expires_at, consumed_at FROM verification_tokens
     WHERE token_hash = $1 AND purpose = 'password_reset'`,
    [tokenHash]
  );

  if (result.rows.length === 0) throw ApiError.badRequest('Invalid reset token');
  const record = result.rows[0];

  if (record.consumed_at) throw ApiError.badRequest('This token has already been used');
  if (new Date(record.expires_at) < new Date()) throw ApiError.badRequest('This token has expired');

  const passwordHash = await hashPassword(newPassword);

  await withTransaction(async (client) => {
    await client.query(
      'UPDATE users SET password_hash = $1, failed_login_attempts = 0, is_locked = false WHERE id = $2',
      [passwordHash, record.user_id]
    );
    await client.query('UPDATE verification_tokens SET consumed_at = now() WHERE id = $1', [record.id]);
    // Resetting a password invalidates all existing sessions — force re-login everywhere.
    await client.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
      record.user_id,
    ]);
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
