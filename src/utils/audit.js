const { query } = require('../db/pool');
const logger = require('../config/logger');

/**
 * Records an entry in audit_logs. Called from admin actions and other
 * sensitive operations (moderation, financial actions) — never from
 * routine reads. Failures here are logged but never thrown, since an
 * audit-log write failing shouldn't block the actual operation it's
 * recording.
 */
async function recordAudit({ actorId = null, action, entityType = null, entityId = null, ipAddress = null, metadata = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, action, entityType, entityId, ipAddress, metadata]
    );
  } catch (err) {
    logger.error('Failed to write audit log', { action, entityType, entityId, error: err.message });
  }
}

module.exports = { recordAudit };
