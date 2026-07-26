const { query } = require('../../db/pool');
const { sendEmail } = require('./email.provider');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

/**
 * The single entry point every other module calls to notify a user —
 * auth (verification/reset), payments (deposit/withdrawal events),
 * campaigns (approval/rejection, Phase 10), etc. Always writes a
 * dashboard notification; email is sent best-effort alongside it and
 * never blocks or fails the caller's main operation.
 */
async function notify(userId, { type, title, message, metadata = null, email = null }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, type, title, message, metadata, read_at, created_at`,
    [userId, type, title, message, metadata]
  );

  if (email) {
    // Fire-and-forget: a slow or failed email provider should never make
    // the calling operation (e.g. a deposit) fail or wait.
    sendEmail({ to: email, subject: title, text: message }).catch((err) =>
      logger.warn('Notification email failed', { userId, type, error: err.message })
    );
  }

  return result.rows[0];
}

async function listMyNotifications(userId, { unreadOnly = false, limit = 20, offset = 0 } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  if (unreadOnly) conditions.push('read_at IS NULL');

  params.push(limit, offset);
  const result = await query(
    `SELECT id, type, title, message, metadata, read_at, created_at
     FROM notifications
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FILTER (WHERE read_at IS NULL) AS unread, COUNT(*) AS total
     FROM notifications WHERE user_id = $1`,
    [userId]
  );

  return {
    notifications: result.rows,
    unreadCount: parseInt(countResult.rows[0].unread, 10),
    total: parseInt(countResult.rows[0].total, 10),
  };
}

async function markRead(notificationId, userId) {
  const result = await query(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING id`,
    [notificationId, userId]
  );
  if (result.rows.length === 0) {
    // Not an error if it was already read — idempotent from the caller's perspective.
    const exists = await query('SELECT id FROM notifications WHERE id = $1 AND user_id = $2', [
      notificationId,
      userId,
    ]);
    if (exists.rows.length === 0) throw ApiError.notFound('Notification not found');
  }
}

async function markAllRead(userId) {
  await query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId]);
}

module.exports = { notify, listMyNotifications, markRead, markAllRead };
