const { query, withTransaction } = require('../../db/pool');
const ApiError = require('../../utils/ApiError');

/**
 * Status transitions allowed via the dedicated action endpoints
 * (pause/resume/archive). Draft → pending_approval happens on submit;
 * pending_approval → active/rejected is an admin action (Phase 10).
 */
const TRANSITIONS = {
  pause: { from: ['active'], to: 'paused' },
  resume: { from: ['paused'], to: 'active' },
  archive: { from: ['completed', 'rejected', 'paused', 'draft'], to: 'archived' },
};

function mapCampaignRow(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    totalBudget: Number(row.total_budget),
    dailyBudget: row.daily_budget !== null ? Number(row.daily_budget) : null,
    bidAmount: Number(row.bid_amount),
    spentAmount: Number(row.spent_amount),
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    targetCountries: row.target_countries,
    targetDevices: row.target_devices,
    targetCategories: row.target_categories,
    targetOs: row.target_os,
    frequencyCap: row.frequency_cap,
    destinationUrl: row.destination_url,
    trackingParams: row.tracking_params,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Loads a campaign and verifies it belongs to the requesting advertiser.
 * Every read/write in this module goes through this — it's the single
 * place ownership is enforced, rather than repeating the check per query.
 */
async function getOwnedCampaign(campaignId, advertiserId) {
  const result = await query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
  if (result.rows.length === 0) throw ApiError.notFound('Campaign not found');
  if (result.rows[0].advertiser_id !== advertiserId) {
    throw ApiError.forbidden('You do not have access to this campaign');
  }
  return result.rows[0];
}

async function createCampaign(advertiserId, input) {
  return withTransaction(async (client) => {
    const campaignResult = await client.query(
      `INSERT INTO campaigns (
         advertiser_id, name, total_budget, daily_budget, bid_amount, currency,
         start_date, end_date, target_countries, target_devices, target_categories,
         target_os, frequency_cap, destination_url, tracking_params
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        advertiserId,
        input.name,
        input.totalBudget,
        input.dailyBudget || null,
        input.bidAmount,
        input.currency,
        input.startDate,
        input.endDate || null,
        input.targetCountries,
        input.targetDevices,
        input.targetCategories,
        input.targetOs,
        input.frequencyCap || null,
        input.destinationUrl,
        input.trackingParams || null,
      ]
    );
    const campaign = campaignResult.rows[0];

    for (const creative of input.creatives) {
      await client.query(
        `INSERT INTO campaign_creatives (campaign_id, type, asset_url, width, height, file_size_bytes, mime_type, headline, body_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          campaign.id,
          creative.type,
          creative.assetUrl || null,
          creative.width || null,
          creative.height || null,
          creative.fileSizeBytes || null,
          creative.mimeType || null,
          creative.headline || null,
          creative.bodyText || null,
        ]
      );
    }

    return mapCampaignRow(campaign);
  });
}

async function listCampaigns(advertiserId, { status, limit, offset }) {
  const conditions = ['advertiser_id = $1'];
  const params = [advertiserId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT * FROM campaigns
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM campaigns WHERE ${conditions.join(' AND ')}`,
    params.slice(0, conditions.length)
  );

  return {
    campaigns: result.rows.map(mapCampaignRow),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function getCampaign(campaignId, advertiserId) {
  const campaign = await getOwnedCampaign(campaignId, advertiserId);

  const creativesResult = await query(
    'SELECT * FROM campaign_creatives WHERE campaign_id = $1 ORDER BY created_at ASC',
    [campaignId]
  );

  return {
    ...mapCampaignRow(campaign),
    creatives: creativesResult.rows.map((c) => ({
      id: c.id,
      type: c.type,
      assetUrl: c.asset_url,
      width: c.width,
      height: c.height,
      headline: c.headline,
      bodyText: c.body_text,
      isActive: c.is_active,
    })),
  };
}

/**
 * Only draft campaigns can be freely edited. Once submitted for approval
 * or live, budget/targeting changes should go through a controlled
 * re-approval flow (Phase 10, admin panel) rather than silent edits to a
 * campaign that may already be spending.
 */
async function updateCampaign(campaignId, advertiserId, updates) {
  const campaign = await getOwnedCampaign(campaignId, advertiserId);

  if (campaign.status !== 'draft') {
    throw ApiError.badRequest(`Cannot edit a campaign with status "${campaign.status}". Only draft campaigns can be edited.`);
  }

  const fieldMap = {
    name: 'name',
    totalBudget: 'total_budget',
    dailyBudget: 'daily_budget',
    bidAmount: 'bid_amount',
    startDate: 'start_date',
    endDate: 'end_date',
    targetCountries: 'target_countries',
    targetDevices: 'target_devices',
    targetCategories: 'target_categories',
    targetOs: 'target_os',
    frequencyCap: 'frequency_cap',
    destinationUrl: 'destination_url',
    trackingParams: 'tracking_params',
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
    return mapCampaignRow(campaign);
  }

  params.push(campaignId);
  const result = await query(
    `UPDATE campaigns SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );

  return mapCampaignRow(result.rows[0]);
}

/** Submits a draft campaign for admin approval. */
async function submitForApproval(campaignId, advertiserId) {
  const campaign = await getOwnedCampaign(campaignId, advertiserId);
  if (campaign.status !== 'draft') {
    throw ApiError.badRequest('Only draft campaigns can be submitted for approval');
  }

  const result = await query(
    `UPDATE campaigns SET status = 'pending_approval', updated_at = now() WHERE id = $1 RETURNING *`,
    [campaignId]
  );
  return mapCampaignRow(result.rows[0]);
}

/** Shared handler for pause / resume / archive — enforces valid transitions. */
async function transitionStatus(action, campaignId, advertiserId) {
  const transition = TRANSITIONS[action];
  const campaign = await getOwnedCampaign(campaignId, advertiserId);

  if (!transition.from.includes(campaign.status)) {
    throw ApiError.badRequest(
      `Cannot ${action} a campaign with status "${campaign.status}". Allowed from: ${transition.from.join(', ')}`
    );
  }

  const result = await query(
    `UPDATE campaigns SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [transition.to, campaignId]
  );
  return mapCampaignRow(result.rows[0]);
}

/** Duplicates a campaign as a new draft — creatives are copied too. */
async function duplicateCampaign(campaignId, advertiserId) {
  const original = await getOwnedCampaign(campaignId, advertiserId);
  const creativesResult = await query('SELECT * FROM campaign_creatives WHERE campaign_id = $1', [
    campaignId,
  ]);

  return withTransaction(async (client) => {
    const copyResult = await client.query(
      `INSERT INTO campaigns (
         advertiser_id, name, status, total_budget, daily_budget, bid_amount, currency,
         start_date, end_date, target_countries, target_devices, target_categories,
         target_os, frequency_cap, destination_url, tracking_params
       ) VALUES ($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        advertiserId,
        `${original.name} (Copy)`,
        original.total_budget,
        original.daily_budget,
        original.bid_amount,
        original.currency,
        original.start_date,
        original.end_date,
        original.target_countries,
        original.target_devices,
        original.target_categories,
        original.target_os,
        original.frequency_cap,
        original.destination_url,
        original.tracking_params,
      ]
    );
    const copy = copyResult.rows[0];

    for (const creative of creativesResult.rows) {
      await client.query(
        `INSERT INTO campaign_creatives (campaign_id, type, asset_url, width, height, file_size_bytes, mime_type, headline, body_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          copy.id,
          creative.type,
          creative.asset_url,
          creative.width,
          creative.height,
          creative.file_size_bytes,
          creative.mime_type,
          creative.headline,
          creative.body_text,
        ]
      );
    }

    return mapCampaignRow(copy);
  });
}

async function addCreative(campaignId, advertiserId, creative) {
  const campaign = await getOwnedCampaign(campaignId, advertiserId);
  if (!['draft', 'pending_approval', 'active', 'paused'].includes(campaign.status)) {
    throw ApiError.badRequest(`Cannot add creatives to a campaign with status "${campaign.status}"`);
  }

  const result = await query(
    `INSERT INTO campaign_creatives (campaign_id, type, asset_url, width, height, file_size_bytes, mime_type, headline, body_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      campaignId,
      creative.type,
      creative.assetUrl || null,
      creative.width || null,
      creative.height || null,
      creative.fileSizeBytes || null,
      creative.mimeType || null,
      creative.headline || null,
      creative.bodyText || null,
    ]
  );

  const c = result.rows[0];
  return {
    id: c.id,
    type: c.type,
    assetUrl: c.asset_url,
    width: c.width,
    height: c.height,
    headline: c.headline,
    bodyText: c.body_text,
    isActive: c.is_active,
  };
}

async function removeCreative(campaignId, creativeId, advertiserId) {
  await getOwnedCampaign(campaignId, advertiserId); // ownership check

  const result = await query(
    'DELETE FROM campaign_creatives WHERE id = $1 AND campaign_id = $2 RETURNING id',
    [creativeId, campaignId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Creative not found');
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaign,
  updateCampaign,
  submitForApproval,
  transitionStatus,
  duplicateCampaign,
  addCreative,
  removeCreative,
};
