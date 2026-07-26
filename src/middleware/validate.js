const ApiError = require('../utils/ApiError');

/**
 * Validates req[source] (default: body) against a zod schema. On failure,
 * throws a 400 with field-level details. Every module's *.schema.js
 * exports zod schemas consumed here — keeps validation declarative and
 * out of controllers.
 *
 * Usage: validate(schema) validates req.body (existing call sites unchanged)
 *        validate(schema, 'query') validates req.query, e.g. list filters
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    // req.query is a getter-only property on some Express versions —
    // assign into the existing object instead of replacing the reference.
    if (source === 'query') {
      Object.assign(req.query, result.data);
    } else {
      req[source] = result.data;
    }
    next();
  };
}

module.exports = validate;
