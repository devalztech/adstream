const adminService = require('./admin.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

// Campaigns
const listPendingCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await adminService.listPendingCampaigns(req.query);
  sendSuccess(res, { data: campaigns });
});

const approveCampaign = asyncHandler(async (req, res) => {
  const campaign = await adminService.approveCampaign(req.params.id, req.user.id, req.ip);
  sendSuccess(res, { message: 'Campaign approved', data: campaign });
});

const rejectCampaign = asyncHandler(async (req, res) => {
  const campaign = await adminService.rejectCampaign(req.params.id, req.body.reason, req.user.id, req.ip);
  sendSuccess(res, { message: 'Campaign rejected', data: campaign });
});

// Websites
const listPendingWebsites = asyncHandler(async (req, res) => {
  const websites = await adminService.listPendingWebsites(req.query);
  sendSuccess(res, { data: websites });
});

const approveWebsite = asyncHandler(async (req, res) => {
  const website = await adminService.approveWebsite(req.params.id, req.user.id, req.ip);
  sendSuccess(res, { message: 'Website approved', data: website });
});

const rejectWebsite = asyncHandler(async (req, res) => {
  const website = await adminService.rejectWebsite(req.params.id, req.body.reason, req.user.id, req.ip);
  sendSuccess(res, { message: 'Website rejected', data: website });
});

const suspendWebsite = asyncHandler(async (req, res) => {
  const website = await adminService.suspendWebsite(req.params.id, req.body.reason, req.user.id, req.ip);
  sendSuccess(res, { message: 'Website suspended', data: website });
});

// Withdrawals
const listPendingWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await adminService.listPendingWithdrawals(req.query);
  sendSuccess(res, { data: withdrawals });
});

const processWithdrawal = asyncHandler(async (req, res) => {
  const result = await adminService.processWithdrawal(req.params.id, req.user.id, req.ip);
  sendSuccess(res, { message: `Withdrawal ${result.status}`, data: result });
});

// Users
const listUsers = asyncHandler(async (req, res) => {
  const { users, total } = await adminService.listUsers(req.query);
  sendSuccess(res, { data: users, meta: { total, limit: req.query.limit, offset: req.query.offset } });
});

const suspendUser = asyncHandler(async (req, res) => {
  await adminService.suspendUser(req.params.id, req.body.reason, req.user.id, req.ip);
  sendSuccess(res, { message: 'User suspended' });
});

const reactivateUser = asyncHandler(async (req, res) => {
  await adminService.reactivateUser(req.params.id, req.user.id, req.ip);
  sendSuccess(res, { message: 'User reactivated' });
});

const adjustUserWallet = asyncHandler(async (req, res) => {
  const transaction = await adminService.adjustUserWallet(req.params.id, req.body, req.user.id, req.ip);
  sendSuccess(res, { message: 'Wallet adjusted', data: transaction });
});

// Overview
const platformOverview = asyncHandler(async (req, res) => {
  const overview = await adminService.getPlatformOverview();
  sendSuccess(res, { data: overview });
});

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
  platformOverview,
};
