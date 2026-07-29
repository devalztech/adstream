const crypto = require('crypto');
const { query } = require('../../db/pool');
const cache = require('../../utils/cache');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

function generateVerificationToken() {
  return crypto.randomBytes(16).toString('hex');
}

function generateEmbedKey() {
  return crypto.randomBytes(12).toString('hex'); // 24 chars, safe to expose client-side
}

function mapWebsiteRow(row) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    category: row.category,
    language: row.language,
    monthlyTrafficEstimate: row.monthly_traffic_estimate,
    verificationMethod: row.verification_method,
    verificationToken: row.verification_token,
    verifiedAt: row.verified_at,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdUnitRow(row) {
  return {
    id: row.id,
    name: row.name,
    format: row.format,
    width: row.width,
    height: row.height,
    embedKey: row.embed_key,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getOwnedWebsite(websiteId, publisherId) {
  const result = await query('SELECT * FROM websites WHERE id = $1', [websiteId]);
  if (result.rows.length === 0) throw ApiError.notFound('Website not found');
  if (result.rows[0].publisher_id !== publisherId) {
    throw ApiError.forbidden('You do not have access to this website');
  }
  return result.rows[0];
}

async function createWebsite(publisherId, input) {
  const existing = await query('SELECT id FROM websites WHERE publisher_id = $1 AND domain = $2', [
    publisherId,
    input.domain,
  ]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('You have already registered this domain');
  }

  const verificationToken = generateVerificationToken();

  const result = await query(
    `INSERT INTO websites (publisher_id, name, domain, category, language, monthly_traffic_estimate, verification_method, verification_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      publisherId,
      input.name,
      input.domain,
      input.category || null,
      input.language,
      input.monthlyTrafficEstimate || null,
      input.verificationMethod,
      verificationToken,
    ]
  );

  return mapWebsiteRow(result.rows[0]);
}

async function listWebsites(publisherId, { status, limit, offset }) {
  const conditions = ['publisher_id = $1'];
  const params = [publisherId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT * FROM websites WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM websites WHERE ${conditions.join(' AND ')}`,
    params.slice(0, conditions.length)
  );

  return { websites: result.rows.map(mapWebsiteRow), total: parseInt(countResult.rows[0].count, 10) };
}

async function getWebsite(websiteId, publisherId) {
  const website = await getOwnedWebsite(websiteId, publisherId);
  const adUnitsResult = await query('SELECT * FROM ad_units WHERE website_id = $1 ORDER BY created_at ASC', [
    websiteId,
  ]);
  return { ...mapWebsiteRow(website), adUnits: adUnitsResult.rows.map(mapAdUnitRow) };
}

async function updateWebsite(websiteId, publisherId, updates) {
  await getOwnedWebsite(websiteId, publisherId);

  const fieldMap = {
    name: 'name',
    category: 'category',
    language: 'language',
    monthlyTrafficEstimate: 'monthly_traffic_estimate',
  };

  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      params.push(updates[key]);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return mapWebsiteRow(await getOwnedWebsite(websiteId, publisherId));
  }

  params.push(websiteId);
  const result = await query(
    `UPDATE websites SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  return mapWebsiteRow(result.rows[0]);
}

/**
 * Attempts to confirm domain ownership by fetching the site and looking
 * for the verification token, per the website's chosen method:
 *  - meta_tag: <meta name="adstream-verification" content="<token>">
 *  - file_upload: a file at /adstream-verify-<token>.txt containing the token
 *  - dns_txt: a TXT record isn't checkable via plain HTTP fetch and needs
 *    a DNS resolver — flagged as a manual/admin-assisted step for now.
 *
 * Network access is best-effort: if the fetch fails (site down, blocked,
 * etc.) this reports a clear failure reason rather than silently marking
 * the site verified.
 */
async function verifyWebsite(websiteId, publisherId) {
  const website = await getOwnedWebsite(websiteId, publisherId);

  if (website.verified_at) {
    throw ApiError.badRequest('This website is already verified');
  }

  if (website.verification_method === 'dns_txt') {
    throw ApiError.badRequest(
      'DNS TXT verification requires manual review — this will be picked up by an admin. ' +
        'Consider using meta_tag or file_upload for instant verification.'
    );
  }

  const checkUrl =
    website.verification_method === 'meta_tag'
      ? `https://${website.domain}/`
      : `https://${website.domain}/adstream-verify-${website.verification_token}.txt`;

  let matched = false;
  try {
    const response = await fetch(checkUrl, {
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw ApiError.badRequest(
        `Could not fetch ${checkUrl} (status ${response.status}). Confirm the verification file/tag is live and publicly accessible.`
      );
    }

    const body = await response.text();

    if (website.verification_method === 'meta_tag') {
      matched = body.includes(website.verification_token);
    } else {
      matched = body.trim() === website.verification_token;
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn('Website verification fetch failed', { websiteId, error: err.message });
    throw ApiError.badRequest(
      `Could not reach ${website.domain} to verify ownership. Confirm the site is publicly accessible and try again.`
    );
  }

  if (!matched) {
    throw ApiError.badRequest('Verification token not found on the page. Double-check placement and try again.');
  }

  const result = await query(
    `UPDATE websites SET status = 'verified', verified_at = now(), updated_at = now() WHERE id = $1 RETURNING *`,
    [websiteId]
  );
  return mapWebsiteRow(result.rows[0]);
}

async function createAdUnit(websiteId, publisherId, input) {
  const website = await getOwnedWebsite(websiteId, publisherId);
  if (!['verified', 'approved'].includes(website.status)) {
    throw ApiError.badRequest('Website must be verified before creating ad units');
  }

  const embedKey = generateEmbedKey();
  const result = await query(
    `INSERT INTO ad_units (website_id, name, format, width, height, embed_key)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [websiteId, input.name, input.format, input.width || null, input.height || null, embedKey]
  );

  return mapAdUnitRow(result.rows[0]);
}

async function listAdUnits(websiteId, publisherId) {
  await getOwnedWebsite(websiteId, publisherId);
  const result = await query('SELECT * FROM ad_units WHERE website_id = $1 ORDER BY created_at DESC', [
    websiteId,
  ]);
  return result.rows.map(mapAdUnitRow);
}

async function updateAdUnitStatus(websiteId, adUnitId, publisherId, status) {
  await getOwnedWebsite(websiteId, publisherId);
  const result = await query(
    `UPDATE ad_units SET status = $1, updated_at = now() WHERE id = $2 AND website_id = $3 RETURNING *`,
    [status, adUnitId, websiteId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Ad unit not found');
  const adUnit = result.rows[0];
  cache.del(`adunit:${adUnit.embed_key}`); // pause/resume must take effect immediately, not after the TTL
  return mapAdUnitRow(adUnit);
}

async function deleteAdUnit(websiteId, adUnitId, publisherId) {
  await getOwnedWebsite(websiteId, publisherId);
  const result = await query('DELETE FROM ad_units WHERE id = $1 AND website_id = $2 RETURNING id, embed_key', [
    adUnitId,
    websiteId,
  ]);
  if (result.rows.length === 0) throw ApiError.notFound('Ad unit not found');
  cache.del(`adunit:${result.rows[0].embed_key}`);
}

/**
 * Generates the async, non-blocking JS embed snippet for an ad unit.
 * Points at this server's own /ad/serve and /ad/click endpoints (the
 * Ad-Serving Engine, Phase 6) — the script itself (served from
 * /ad/embed.js) fetches the ad, injects markup into the div, and wires
 * the click-through link, without ever blocking the host page's render.
 */
function getEmbedCode(adUnit, baseUrl) {
  return (
    `<div id="adstream-${adUnit.embedKey}"></div>\n` +
    `<script async src="${baseUrl}/ad/embed.js" ` +
    `data-adstream-unit="${adUnit.embedKey}"></script>`
  );
}

module.exports = {
  createWebsite,
  listWebsites,
  getWebsite,
  updateWebsite,
  verifyWebsite,
  createAdUnit,
  listAdUnits,
  updateAdUnitStatus,
  deleteAdUnit,
  getEmbedCode,
};
