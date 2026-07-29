const analyticsService = require('./analytics.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const advertiserOverview = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdvertiserOverview(req.user.id, req.query.range);
  sendSuccess(res, { data });
});

const campaignAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getCampaignAnalytics(req.params.id, req.user.id, req.query.range);
  sendSuccess(res, { data });
});

const publisherOverview = asyncHandler(async (req, res) => {
  const data = await analyticsService.getPublisherOverview(req.user.id, req.query.range);
  sendSuccess(res, { data });
});

const websiteAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getWebsiteAnalytics(req.params.id, req.user.id, req.query.range);
  sendSuccess(res, { data });
});

module.exports = { advertiserOverview, campaignAnalytics, publisherOverview, websiteAnalytics };
