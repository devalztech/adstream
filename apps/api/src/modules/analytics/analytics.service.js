const { query } = require('../../db/pool');
const ApiError = require('../../utils/ApiError');

const RANGE_TO_INTERVAL = {
  today: '1 day',
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  year: '365 days',
};

function intervalFor(range) {
  return RANGE_TO_INTERVAL[range] || RANGE_TO_INTERVAL['30d'];
}

/** CTR/CPM/CPC/CPA are derived in JS from raw counts, not stored — always computed fresh from the ledger of events. */
function deriveMetrics({ impressions, clicks, conversions, spend }) {
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;

  return {
    impressions,
    clicks,
    conversions,
    spend,
    ctr: Number(ctr.toFixed(2)),
    cpm: Math.round(cpm),
    cpc: Math.round(cpc),
    conversionRate: Number(conversionRate.toFixed(2)),
    cpa: Math.round(cpa),
  };
}

/**
 * Verifies the campaign belongs to the requesting advertiser before
 * running any analytics query against it — same ownership pattern used
 * throughout the campaigns/websites modules.
 */
async function assertOwnsCampaign(campaignId, advertiserId) {
  const result = await query('SELECT id FROM campaigns WHERE id = $1 AND advertiser_id = $2', [
    campaignId,
    advertiserId,
  ]);
  if (result.rows.length === 0) throw ApiError.notFound('Campaign not found');
}

async function assertOwnsWebsite(websiteId, publisherId) {
  const result = await query('SELECT id FROM websites WHERE id = $1 AND publisher_id = $2', [
    websiteId,
    publisherId,
  ]);
  if (result.rows.length === 0) throw ApiError.notFound('Website not found');
}

/** Advertiser-facing: performance for a single campaign, plus a daily breakdown for charting. */
async function getCampaignAnalytics(campaignId, advertiserId, range) {
  await assertOwnsCampaign(campaignId, advertiserId);
  const interval = intervalFor(range);

  const totalsResult = await query(
    `SELECT
       (SELECT COUNT(*) FROM impressions WHERE campaign_id = $1 AND created_at > now() - $2::interval) AS impressions,
       (SELECT COUNT(*) FROM clicks WHERE campaign_id = $1 AND created_at > now() - $2::interval) AS clicks,
       (SELECT COUNT(*) FROM conversions WHERE campaign_id = $1 AND created_at > now() - $2::interval) AS conversions,
       (SELECT COALESCE(SUM(cost), 0) FROM impressions WHERE campaign_id = $1 AND created_at > now() - $2::interval) AS impression_spend,
       (SELECT COALESCE(SUM(cost), 0) FROM clicks WHERE campaign_id = $1 AND created_at > now() - $2::interval) AS click_spend`,
    [campaignId, interval]
  );
  const t = totalsResult.rows[0];

  const dailyResult = await query(
    `SELECT
       date_trunc('day', d.day) AS day,
       COALESCE(i.count, 0) AS impressions,
       COALESCE(c.count, 0) AS clicks
     FROM generate_series(now() - $2::interval, now(), '1 day') AS d(day)
     LEFT JOIN (
       SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
       FROM impressions WHERE campaign_id = $1 AND created_at > now() - $2::interval
       GROUP BY 1
     ) i ON i.day = date_trunc('day', d.day)
     LEFT JOIN (
       SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
       FROM clicks WHERE campaign_id = $1 AND created_at > now() - $2::interval
       GROUP BY 1
     ) c ON c.day = date_trunc('day', d.day)
     ORDER BY day ASC`,
    [campaignId, interval]
  );

  const topCountriesResult = await query(
    `SELECT country, COUNT(*) AS impressions
     FROM impressions
     WHERE campaign_id = $1 AND created_at > now() - $2::interval AND country IS NOT NULL
     GROUP BY country ORDER BY impressions DESC LIMIT 5`,
    [campaignId, interval]
  );

  const topDevicesResult = await query(
    `SELECT device, COUNT(*) AS impressions
     FROM impressions
     WHERE campaign_id = $1 AND created_at > now() - $2::interval AND device IS NOT NULL
     GROUP BY device ORDER BY impressions DESC LIMIT 5`,
    [campaignId, interval]
  );

  return {
    ...deriveMetrics({
      impressions: parseInt(t.impressions, 10),
      clicks: parseInt(t.clicks, 10),
      conversions: parseInt(t.conversions, 10),
      spend: parseInt(t.impression_spend, 10) + parseInt(t.click_spend, 10),
    }),
    daily: dailyResult.rows.map((r) => ({
      date: r.day,
      impressions: parseInt(r.impressions, 10),
      clicks: parseInt(r.clicks, 10),
    })),
    topCountries: topCountriesResult.rows.map((r) => ({ country: r.country, impressions: parseInt(r.impressions, 10) })),
    topDevices: topDevicesResult.rows.map((r) => ({ device: r.device, impressions: parseInt(r.impressions, 10) })),
  };
}

/** Advertiser-facing: rollup across every campaign the advertiser owns. */
async function getAdvertiserOverview(advertiserId, range) {
  const interval = intervalFor(range);

  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM impressions i JOIN campaigns c ON c.id = i.campaign_id
         WHERE c.advertiser_id = $1 AND i.created_at > now() - $2::interval) AS impressions,
       (SELECT COUNT(*) FROM clicks cl JOIN campaigns c ON c.id = cl.campaign_id
         WHERE c.advertiser_id = $1 AND cl.created_at > now() - $2::interval) AS clicks,
       (SELECT COUNT(*) FROM conversions cv JOIN campaigns c ON c.id = cv.campaign_id
         WHERE c.advertiser_id = $1 AND cv.created_at > now() - $2::interval) AS conversions,
       (SELECT COALESCE(SUM(i.cost), 0) FROM impressions i JOIN campaigns c ON c.id = i.campaign_id
         WHERE c.advertiser_id = $1 AND i.created_at > now() - $2::interval) AS impression_spend,
       (SELECT COALESCE(SUM(cl.cost), 0) FROM clicks cl JOIN campaigns c ON c.id = cl.campaign_id
         WHERE c.advertiser_id = $1 AND cl.created_at > now() - $2::interval) AS click_spend,
       (SELECT COUNT(*) FROM campaigns WHERE advertiser_id = $1 AND status = 'active') AS active_campaigns`,
    [advertiserId, interval]
  );
  const t = result.rows[0];

  const topCampaignsResult = await query(
    `SELECT c.id, c.name, COUNT(i.id) AS impressions, COALESCE(SUM(i.cost), 0) AS spend
     FROM campaigns c
     LEFT JOIN impressions i ON i.campaign_id = c.id AND i.created_at > now() - $2::interval
     WHERE c.advertiser_id = $1
     GROUP BY c.id, c.name
     ORDER BY spend DESC LIMIT 5`,
    [advertiserId, interval]
  );

  return {
    ...deriveMetrics({
      impressions: parseInt(t.impressions, 10),
      clicks: parseInt(t.clicks, 10),
      conversions: parseInt(t.conversions, 10),
      spend: parseInt(t.impression_spend, 10) + parseInt(t.click_spend, 10),
    }),
    activeCampaigns: parseInt(t.active_campaigns, 10),
    topCampaigns: topCampaignsResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      impressions: parseInt(r.impressions, 10),
      spend: parseInt(r.spend, 10),
    })),
  };
}

/** Publisher-facing: earnings and traffic for a single website. */
async function getWebsiteAnalytics(websiteId, publisherId, range) {
  await assertOwnsWebsite(websiteId, publisherId);
  const interval = intervalFor(range);

  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM impressions WHERE website_id = $1 AND created_at > now() - $2::interval) AS impressions,
       (SELECT COUNT(*) FROM clicks WHERE website_id = $1 AND created_at > now() - $2::interval) AS clicks,
       (SELECT COALESCE(SUM(cost), 0) FROM impressions WHERE website_id = $1 AND created_at > now() - $2::interval) AS impression_earnings,
       (SELECT COALESCE(SUM(cost), 0) FROM clicks WHERE website_id = $1 AND created_at > now() - $2::interval) AS click_earnings`,
    [websiteId, interval]
  );
  const t = result.rows[0];
  const earnings = parseInt(t.impression_earnings, 10) + parseInt(t.click_earnings, 10);

  const dailyResult = await query(
    `SELECT date_trunc('day', d.day) AS day, COALESCE(i.count, 0) AS impressions, COALESCE(i.earnings, 0) AS earnings
     FROM generate_series(now() - $2::interval, now(), '1 day') AS d(day)
     LEFT JOIN (
       SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count, SUM(cost) AS earnings
       FROM impressions WHERE website_id = $1 AND created_at > now() - $2::interval
       GROUP BY 1
     ) i ON i.day = date_trunc('day', d.day)
     ORDER BY day ASC`,
    [websiteId, interval]
  );

  return {
    impressions: parseInt(t.impressions, 10),
    clicks: parseInt(t.clicks, 10),
    earnings,
    daily: dailyResult.rows.map((r) => ({
      date: r.day,
      impressions: parseInt(r.impressions, 10),
      earnings: parseInt(r.earnings, 10),
    })),
  };
}

/** Publisher-facing: rollup across every website the publisher owns. */
async function getPublisherOverview(publisherId, range) {
  const interval = intervalFor(range);

  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM impressions i JOIN websites w ON w.id = i.website_id
         WHERE w.publisher_id = $1 AND i.created_at > now() - $2::interval) AS impressions,
       (SELECT COUNT(*) FROM clicks cl JOIN websites w ON w.id = cl.website_id
         WHERE w.publisher_id = $1 AND cl.created_at > now() - $2::interval) AS clicks,
       (SELECT COALESCE(SUM(i.cost), 0) FROM impressions i JOIN websites w ON w.id = i.website_id
         WHERE w.publisher_id = $1 AND i.created_at > now() - $2::interval) AS impression_earnings,
       (SELECT COALESCE(SUM(cl.cost), 0) FROM clicks cl JOIN websites w ON w.id = cl.website_id
         WHERE w.publisher_id = $1 AND cl.created_at > now() - $2::interval) AS click_earnings,
       (SELECT COUNT(*) FROM websites WHERE publisher_id = $1 AND status IN ('verified','approved')) AS active_sites`,
    [publisherId, interval]
  );
  const t = result.rows[0];

  const topSitesResult = await query(
    `SELECT w.id, w.name, w.domain, COUNT(i.id) AS impressions, COALESCE(SUM(i.cost), 0) AS earnings
     FROM websites w
     LEFT JOIN impressions i ON i.website_id = w.id AND i.created_at > now() - $2::interval
     WHERE w.publisher_id = $1
     GROUP BY w.id, w.name, w.domain
     ORDER BY earnings DESC LIMIT 5`,
    [publisherId, interval]
  );

  return {
    impressions: parseInt(t.impressions, 10),
    clicks: parseInt(t.clicks, 10),
    earnings: parseInt(t.impression_earnings, 10) + parseInt(t.click_earnings, 10),
    activeSites: parseInt(t.active_sites, 10),
    topSites: topSitesResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      domain: r.domain,
      impressions: parseInt(r.impressions, 10),
      earnings: parseInt(r.earnings, 10),
    })),
  };
}

module.exports = {
  getCampaignAnalytics,
  getAdvertiserOverview,
  getWebsiteAnalytics,
  getPublisherOverview,
};
