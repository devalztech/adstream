/**
 * Every successful response goes through this so the API returns a
 * consistent JSON envelope, regardless of which module or phase built it.
 */
function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta = null }) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess };
