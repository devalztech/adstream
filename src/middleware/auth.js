const { verifyAccessToken } = require('../utils/tokens');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the access token on protected routes and attaches
 * { id, role } to req.user. Does not hit the database — that's the point
 * of short-lived access tokens; revocation happens via refresh tokens.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
});

module.exports = { requireAuth };
