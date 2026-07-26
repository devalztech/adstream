const { query } = require('../../db/pool');
const adServingService = require('./ad-serving.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

/** Very rough device detection from User-Agent — good enough for targeting, not a full UA parser dependency. */
function detectDevice(userAgent = '') {
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

/**
 * GET /serve?unit=<embedKey>
 * Called by the publisher's embed script. No auth — the embed_key itself
 * is the only credential, and it's meant to be public (embedded in HTML).
 * Returns 204 with no body when no ad matches, so the embed script can
 * simply hide the slot rather than parsing an error.
 */
const serve = asyncHandler(async (req, res) => {
  const { unit, country, device, os } = req.query;
  if (!unit) throw ApiError.badRequest('unit query parameter is required');

  const result = await adServingService.serveAd(unit, {
    country,
    device: device || detectDevice(req.headers['user-agent']),
    os,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (!result) {
    return res.status(204).send();
  }

  sendSuccess(res, { data: result });
});

/**
 * GET /click?imp=<impressionId>
 * The creative's href points here so a click is recorded before the user
 * is forwarded to the advertiser's destination_url — hence the redirect
 * rather than a JSON response.
 */
const click = asyncHandler(async (req, res) => {
  const { imp } = req.query;
  if (!imp) throw ApiError.badRequest('imp query parameter is required');

  const destResult = await query(
    `SELECT c.destination_url FROM impressions i JOIN campaigns c ON c.id = i.campaign_id WHERE i.id = $1`,
    [imp]
  );
  if (destResult.rows.length === 0) throw ApiError.notFound('Impression not found');

  await adServingService.recordClick(imp, {
    ip: req.ip,
    device: detectDevice(req.headers['user-agent']),
    country: req.query.country,
  });

  res.redirect(302, destResult.rows[0].destination_url);
});

/**
 * POST /conversions — called by the advertiser's own site (via their
 * tracking pixel/webhook) once a click leads to a signup/purchase/etc.
 */
const conversion = asyncHandler(async (req, res) => {
  const result = await adServingService.recordConversion(req.body.clickId, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Conversion recorded', data: result });
});

module.exports = { serve, click, conversion };
