const ApiError = require('../utils/ApiError');

/**
 * Restricts a route to specific roles. Must run after requireAuth.
 * Usage: router.get('/admin/stuff', requireAuth, requireRole('admin'), handler)
 *
 * This is the enforcement point for the "never mix dashboards/permissions"
 * requirement — every advertiser/publisher/admin-only route declares its
 * allowed role(s) explicitly here rather than relying on frontend routing.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}

module.exports = { requireRole };
