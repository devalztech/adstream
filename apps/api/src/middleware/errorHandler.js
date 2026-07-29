const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Unexpected error (bug, driver error, etc.) — don't leak internals to the client.
    logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
    error = ApiError.internal(env.nodeEnv === 'development' ? err.message : 'Internal server error');
  } else if (error.statusCode >= 500) {
    logger.error(error.message, { path: req.path, details: error.details });
  }

  const body = {
    success: false,
    message: error.message,
  };
  if (error.details) body.details = error.details;
  if (env.nodeEnv === 'development' && err.stack) body.stack = err.stack;

  res.status(error.statusCode || 500).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
