const { query } = require('../../db/pool');
const { recordAudit } = require('../../utils/audit');
const cache = require('../../utils/cache');
const notificationsService = require('../notifications/notifications.service');
const paymentsService = require('../payments/payments.service');
const walletsService = require('../wallets/wallets.service');
const ApiError = require('../../utils/ApiError');

// ---------------------------------------------------------------------
// Campaign moderation
// ---------------------------------------------------------------------

async function listPendingCampaigns({ status, limit, offset }) {
  const targetStatus = status || 'pending_approval';
  const result = await query(
    `SELECT c.*, u.email AS advertiser_email, u.full_name AS advertiser_name
     FROM campaigns c JOIN users u ON u.id = c.advertiser_id
     WHERE c.status = $1
     ORDER BY c.created_at ASC
     LIMIT $2 OFFSET $3`,
    [targetStatus, limit, offset]
  );
  return result.rows;
}

async function approveCampaign(campaignId, adminId, ipAddress) {
  const result = await query(
    `UPDATE campaigns SET status = 'active', approved_at = now(), approved_by = $1, updated_at = now()
     WHERE id = $2 AND status = 'pending_approval'
     RETURNING *`,
    [adminId, campaignId]
  );
  if (result.rows.length === 0) {
    throw ApiError.badRequest('Campaign not found or not in pending_approval status');
  }
  const campaign = result.rows[0];

  const advertiser = await query('SELECT email FROM users WHERE id = $1', [campaign.advertiser_id]);
  await notificationsService.notify(campaign.advertiser_id, {
    type: 'campaign.approved',
    title: 'Campaign approved',
    message: `Your campaign "${campaign.name}" has been approved and is now live.`,
    metadata: { campaignId },
    email: advertiser.rows[0]?.email,
  });

  await recordAudit({
    actorId: adminId,
    action: 'campaign.approve',
    entityType: 'campaign',
    entityId: campaignId,
    ipAddress,
  });

  return campaign;
}

async function rejectCampaign(campaignId, reason, adminId, ipAddress) {
  const result = await query(
    `UPDATE campaigns SET status = 'rejected', rejection_reason = $1, updated_at = now()
     WHERE id = $2 AND status = 'pending_approval'
     RETURNING *`,
    [reason, campaignId]
  );
  if (result.rows.length === 0) {
    throw ApiError.badRequest('Campaign not found or not in pending_approval status');
  }
  const campaign = result.rows[0];

  const advertiser = await query('SELECT email FROM users WHERE id = $1', [campaign.advertiser_id]);
  await notificationsService.notify(campaign.advertiser_id, {
    type: 'campaign.rejected',
    title: 'Campaign rejected',
    message: `Your campaign "${campaign.name}" was rejected: ${reason}`,
    metadata: { campaignId, reason },
    email: advertiser.rows[0]?.email,
  });

  await recordAudit({
    actorId: adminId,
    action: 'campaign.reject',
    entityType: 'campaign',
    entityId: campaignId,
    ipAddress,
    metadata: { reason },
  });

  return campaign;
}

// ---------------------------------------------------------------------
// Website moderation
// ---------------------------------------------------------------------

async function listPendingWebsites({ status, limit, offset }) {
  const targetStatus = status || 'verified'; // domain-verified sites awaiting admin approval to go live
  const result = await query(
    `SELECT w.*, u.email AS publisher_email, u.full_name AS publisher_name
     FROM websites w JOIN users u ON u.id = w.publisher_id
     WHERE w.status = $1
     ORDER BY w.created_at ASC
     LIMIT $2 OFFSET $3`,
    [targetStatus, limit, offset]
  );
  return result.rows;
}

async function approveWebsite(websiteId, adminId, ipAddress) {
  const result = await query(
    `UPDATE websites SET status = 'approved', updated_at = now() WHERE id = $1 AND status = 'verified' RETURNING *`,
    [websiteId]
  );
  if (result.rows.length === 0) {
    throw ApiError.badRequest('Website not found or not in verified status');
  }
  const website = result.rows[0];

  const publisher = await query('SELECT email FROM users WHERE id = $1', [website.publisher_id]);
  await notificationsService.notify(website.publisher_id, {
    type: 'website.approved',
    title: 'Website approved',
    message: `Your website "${website.name}" has been approved. You can now serve ads on it.`,
    metadata: { websiteId },
    email: publisher.rows[0]?.email,
  });

  await recordAudit({ actorId: adminId, action: 'website.approve', entityType: 'website', entityId: websiteId, ipAddress });
  return website;
}

async function rejectWebsite(websiteId, reason, adminId, ipAddress) {
  const result = await query(
    `UPDATE websites SET status = 'rejected', rejection_reason = $1, updated_at = now() WHERE id = $2 AND status = 'verified' RETURNING *`,
    [reason, websiteId]
  );
  if (result.rows.length === 0) {
    throw ApiError.badRequest('Website not found or not in verified status');
  }
  const website = result.rows[0];

  const publisher = await query('SELECT email FROM users WHERE id = $1', [website.publisher_id]);
  await notificationsService.notify(website.publisher_id, {
    type: 'website.rejected',
    title: 'Website rejected',
    message: `Your website "${website.name}" was rejected: ${reason}`,
    metadata: { websiteId, reason },
    email: publisher.rows[0]?.email,
  });

  await recordAudit({ actorId: adminId, action: 'website.reject', entityType: 'website', entityId: websiteId, ipAddress, metadata: { reason } });
  return website;
}

async function suspendWebsite(websiteId, reason, adminId, ipAddress) {
  const result = await query(
    `UPDATE websites SET status = 'suspended', rejection_reason = $1, updated_at = now() WHERE id = $2 AND status = 'approved' RETURNING *`,
    [reason, websiteId]
  );
  if (result.rows.length === 0) {
    throw ApiError.badRequest('Website not found or not currently approved');
  }
  const website = result.rows[0];

  // Suspending a website should also pause every ad unit on it, so ad
  // serving stops immediately rather than waiting for a future check.
  const pausedUnits = await query(
    `UPDATE ad_units SET status = 'paused', updated_at = now() WHERE website_id = $1 AND status = 'active' RETURNING embed_key`,
    [websiteId]
  );
  pausedUnits.rows.forEach((row) => cache.del(`adunit:${row.embed_key}`));

  const publisher = await query('SELECT email FROM users WHERE id = $1', [website.publisher_id]);
  await notificationsService.notify(website.publisher_id, {
    type: 'website.suspended',
    title: 'Website suspended',
    message: `Your website "${website.name}" has been suspended: ${reason}`,
    metadata: { websiteId, reason },
    email: publisher.rows[0]?.email,
  });

  await recordAudit({ actorId: adminId, action: 'website.suspend', entityType: 'website', entityId: websiteId, ipAddress, metadata: { reason } });
  return website;
}

// ---------------------------------------------------------------------
// Withdrawal processing
// ---------------------------------------------------------------------

async function listPendingWithdrawals({ limit, offset }) {
  const result = await query(
    `SELECT wr.*, u.email AS user_email, u.full_name AS user_name
     FROM withdrawal_requests wr JOIN users u ON u.id = wr.user_id
     WHERE wr.status = 'pending'
     ORDER BY wr.requested_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

async function processWithdrawal(withdrawalId, adminId, ipAddress) {
  const result = await paymentsService.processWithdrawal(withdrawalId);
  await recordAudit({
    actorId: adminId,
    action: 'withdrawal.process',
    entityType: 'withdrawal_request',
    entityId: withdrawalId,
    ipAddress,
    metadata: { result },
  });
  return result;
}

// ---------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------

async function listUsers({ role, search, limit, offset }) {
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`r.name = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.company_name, u.is_active, u.is_locked,
            u.email_verified_at, u.created_at, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id ${whereClause}`,
    params.slice(0, conditions.length)
  );

  return { users: result.rows, total: parseInt(countResult.rows[0].count, 10) };
}

async function suspendUser(userId, reason, adminId, ipAddress) {
  const result = await query(
    `UPDATE users SET is_active = false, updated_at = now() WHERE id = $1 RETURNING id, email`,
    [userId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('User not found');

  await notificationsService.notify(userId, {
    type: 'account.suspended',
    title: 'Account suspended',
    message: reason ? `Your account has been suspended: ${reason}` : 'Your account has been suspended.',
    email: result.rows[0].email,
  });

  await recordAudit({ actorId: adminId, action: 'user.suspend', entityType: 'user', entityId: userId, ipAddress, metadata: { reason } });
}

async function reactivateUser(userId, adminId, ipAddress) {
  const result = await query(
    `UPDATE users SET is_active = true, is_locked = false, failed_login_attempts = 0, updated_at = now() WHERE id = $1 RETURNING id, email`,
    [userId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('User not found');

  await notificationsService.notify(userId, {
    type: 'account.reactivated',
    title: 'Account reactivated',
    message: 'Your account has been reactivated. You can now log in.',
    email: result.rows[0].email,
  });

  await recordAudit({ actorId: adminId, action: 'user.reactivate', entityType: 'user', entityId: userId, ipAddress });
}

/** Admin-initiated wallet correction — a manual credit or debit with a required reason, fully audited. */
async function adjustUserWallet(userId, { amount, reason }, adminId, ipAddress) {
  const transaction = await walletsService.recordTransaction(userId, {
    type: 'adjustment',
    amount,
    description: reason,
    metadata: { adjustedBy: adminId },
  });

  await notificationsService.notify(userId, {
    type: 'wallet.adjustment',
    title: 'Wallet adjustment',
    message: `An admin adjustment of ${(amount / 100).toFixed(2)} was applied to your wallet: ${reason}`,
    metadata: { transactionId: transaction.id },
  });

  await recordAudit({
    actorId: adminId,
    action: 'wallet.adjust',
    entityType: 'wallet',
    entityId: userId,
    ipAddress,
    metadata: { amount, reason },
  });

  return transaction;
}

// ---------------------------------------------------------------------
// Revenue / platform overview
// ---------------------------------------------------------------------

async function getPlatformOverview() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'advertiser')) AS total_advertisers,
      (SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'publisher')) AS total_publishers,
      (SELECT COUNT(*) FROM campaigns WHERE status = 'active') AS active_campaigns,
      (SELECT COUNT(*) FROM campaigns WHERE status = 'pending_approval') AS pending_campaigns,
      (SELECT COUNT(*) FROM websites WHERE status IN ('verified')) AS pending_websites,
      (SELECT COUNT(*) FROM websites WHERE status = 'approved') AS approved_websites,
      (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending') AS pending_withdrawals,
      (SELECT COALESCE(SUM(cost), 0) FROM impressions WHERE created_at > now() - interval '30 days') AS impression_revenue_30d,
      (SELECT COALESCE(SUM(cost), 0) FROM clicks WHERE created_at > now() - interval '30 days') AS click_revenue_30d,
      (SELECT COALESCE(SUM(balance), 0) FROM wallets) AS total_wallet_balances
  `);
  const r = result.rows[0];

  return {
    totalAdvertisers: parseInt(r.total_advertisers, 10),
    totalPublishers: parseInt(r.total_publishers, 10),
    activeCampaigns: parseInt(r.active_campaigns, 10),
    pendingCampaigns: parseInt(r.pending_campaigns, 10),
    pendingWebsites: parseInt(r.pending_websites, 10),
    approvedWebsites: parseInt(r.approved_websites, 10),
    pendingWithdrawals: parseInt(r.pending_withdrawals, 10),
    revenueLast30Days: parseInt(r.impression_revenue_30d, 10) + parseInt(r.click_revenue_30d, 10),
    totalWalletBalances: parseInt(r.total_wallet_balances, 10),
  };
}

module.exports = {
  listPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  listPendingWebsites,
  approveWebsite,
  rejectWebsite,
  suspendWebsite,
  listPendingWithdrawals,
  processWithdrawal,
  listUsers,
  suspendUser,
  reactivateUser,
  adjustUserWallet,
  getPlatformOverview,
};
