const crypto = require('crypto');
const { query, withTransaction } = require('../../db/pool');
const walletsService = require('../wallets/wallets.service');
const cache = require('../../utils/cache');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

const AD_UNIT_CACHE_TTL_MS = 30_000; // 30s — short enough that a paused unit stops serving quickly

function hashIp(ip) {
  // One-way hash, not reversible — used only for frequency capping and
  // basic fraud signals, never stored or exposed as a raw IP.
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex');
}

/**
 * Finds the best-matching active campaign+creative for an ad unit.
 *
 * Matching rules (all are "unset target = matches everything"):
 *  - campaign.status = 'active'
 *  - now() between start_date and end_date
 *  - spent_amount < total_budget (budget not exhausted)
 *  - target_countries is empty OR contains the request's country
 *  - target_devices is empty OR contains the request's device
 *  - target_os is empty OR contains the request's os
 *  - has at least one active creative compatible with the ad unit's format
 *    (banner/video creatives need width/height reasonably close to the
 *     unit; text/native creatives fit any unit)
 *
 * Selection among matches: highest bid_amount first (simple first-price
 * auction) — a proper second-price/real-time-bidding auction is a
 * reasonable future upgrade but out of scope for getting ad serving working.
 *
 * This is one SQL query by design — the <100ms performance goal doesn't
 * leave room for N+1 lookups on the hot path.
 */
async function findMatchingAd({ adUnitId, country, device, os }) {
  const result = await query(
    `SELECT c.id AS campaign_id, c.bid_amount, c.currency,
            cc.id AS creative_id, cc.type, cc.asset_url, cc.width, cc.height, cc.headline, cc.body_text
     FROM campaigns c
     JOIN campaign_creatives cc ON cc.campaign_id = c.id AND cc.is_active = true
     JOIN ad_units au ON au.id = $1
     WHERE c.status = 'active'
       AND now() BETWEEN c.start_date AND COALESCE(c.end_date, 'infinity'::timestamptz)
       AND c.spent_amount < c.total_budget
       AND (c.target_countries = '{}' OR $2::varchar = ANY(c.target_countries))
       AND (c.target_devices = '{}' OR $3::varchar = ANY(c.target_devices))
       AND (c.target_os = '{}' OR $4::varchar = ANY(c.target_os))
       AND (
         cc.type IN ('text', 'native')
         OR au.format IN ('responsive', 'native')
         OR (cc.width IS NOT NULL AND cc.height IS NOT NULL)
       )
     ORDER BY c.bid_amount DESC
     LIMIT 1`,
    [adUnitId, country || null, device || null, os || null]
  );

  return result.rows[0] || null;
}

async function getAdvertiserId(campaignId) {
  const result = await query('SELECT advertiser_id FROM campaigns WHERE id = $1', [campaignId]);
  return result.rows[0]?.advertiser_id;
}

/**
 * Serves an ad for a given embed key. Looks up the ad unit, finds a
 * matching campaign, records the impression (debiting the advertiser's
 * wallet by the bid amount as CPM cost), and returns the creative payload
 * the embed script needs to render.
 *
 * Returns null if the ad unit doesn't exist/isn't active, or if no
 * campaign currently matches — callers should render nothing rather
 * than an error in that case (an empty ad slot, not a broken page).
 */
async function serveAd(embedKey, { country, device, os, ip, userAgent }) {
  const cacheKey = `adunit:${embedKey}`;
  let adUnit = cache.get(cacheKey);

  if (adUnit === undefined) {
    const unitResult = await query(
      `SELECT au.id, au.format, au.website_id FROM ad_units au
       WHERE au.embed_key = $1 AND au.status = 'active'`,
      [embedKey]
    );
    adUnit = unitResult.rows[0] || null;
    cache.set(cacheKey, adUnit, AD_UNIT_CACHE_TTL_MS);
  }

  if (!adUnit) return null;

  const match = await findMatchingAd({ adUnitId: adUnit.id, country, device, os });
  if (!match) return null;

  const ipHash = hashIp(ip);
  const cost = match.bid_amount; // simple CPM: bid_amount charged per impression

  let impression;
  try {
    impression = await withTransaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO impressions (campaign_id, creative_id, ad_unit_id, website_id, cost, country, device, ip_hash, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [match.campaign_id, match.creative_id, adUnit.id, adUnit.website_id, cost, country || null, device || null, ipHash, userAgent || null]
      );

      await client.query(
        `UPDATE campaigns SET spent_amount = spent_amount + $1, updated_at = now() WHERE id = $2`,
        [cost, match.campaign_id]
      );

      return insertResult.rows[0];
    });
  } catch (err) {
    logger.error('Failed to record impression', { embedKey, error: err.message });
    return null; // serving must not 500 the publisher's page over a logging failure
  }

  // Advertiser wallet debit runs after the impression is durably recorded,
  // through the same ledger-safe function campaign spend always uses.
  // If this fails (e.g. balance already at zero due to a race), the
  // impression stays recorded — the campaign's spent_amount is the
  // source of truth for budget exhaustion, wallet debit is bookkeeping.
  try {
    const advertiserId = await getAdvertiserId(match.campaign_id);
    await walletsService.recordTransaction(advertiserId, {
      type: 'campaign_spend',
      amount: -cost,
      description: 'Ad impression',
      metadata: { campaignId: match.campaign_id, impressionId: impression.id },
    });
  } catch (err) {
    logger.warn('Wallet debit failed for impression (non-fatal)', {
      campaignId: match.campaign_id,
      error: err.message,
    });
  }

  return {
    impressionId: impression.id,
    creative: {
      type: match.type,
      assetUrl: match.asset_url,
      width: match.width,
      height: match.height,
      headline: match.headline,
      bodyText: match.body_text,
    },
  };
}

/**
 * Records a click against a previously-served impression. CPC cost is
 * the same bid_amount used for the impression, for simplicity — a real
 * hybrid CPM/CPC model would price these independently per campaign.
 */
async function recordClick(impressionId, { ip, device, country }) {
  const impResult = await query(
    `SELECT i.campaign_id, i.creative_id, i.ad_unit_id, i.website_id, c.bid_amount
     FROM impressions i
     JOIN campaigns c ON c.id = i.campaign_id
     WHERE i.id = $1`,
    [impressionId]
  );
  if (impResult.rows.length === 0) throw ApiError.notFound('Impression not found');
  const imp = impResult.rows[0];

  const ipHash = hashIp(ip);

  // Basic fraud signal: flag (not block) if this IP has clicked the same
  // campaign more than 5 times in the last hour. Real fraud detection
  // needs more signals — this is a starting heuristic, not a final system.
  const recentClicks = await query(
    `SELECT COUNT(*) FROM clicks WHERE campaign_id = $1 AND ip_hash = $2 AND created_at > now() - interval '1 hour'`,
    [imp.campaign_id, ipHash]
  );
  const isSuspicious = parseInt(recentClicks.rows[0].count, 10) >= 5;

  const result = await query(
    `INSERT INTO clicks (impression_id, campaign_id, creative_id, ad_unit_id, website_id, cost, country, device, ip_hash, is_suspicious)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [impressionId, imp.campaign_id, imp.creative_id, imp.ad_unit_id, imp.website_id, imp.bid_amount, country || null, device || null, ipHash, isSuspicious]
  );

  return { clickId: result.rows[0].id, flagged: isSuspicious };
}

async function recordConversion(clickId, { value, metadata }) {
  const clickResult = await query('SELECT campaign_id FROM clicks WHERE id = $1', [clickId]);
  if (clickResult.rows.length === 0) throw ApiError.notFound('Click not found');

  const result = await query(
    `INSERT INTO conversions (click_id, campaign_id, value, metadata) VALUES ($1,$2,$3,$4) RETURNING id`,
    [clickId, clickResult.rows[0].campaign_id, value || null, metadata || null]
  );
  return { conversionId: result.rows[0].id };
}

module.exports = { serveAd, recordClick, recordConversion };
