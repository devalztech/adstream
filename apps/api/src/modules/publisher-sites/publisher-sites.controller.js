const sitesService = require('./publisher-sites.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const createWebsite = asyncHandler(async (req, res) => {
  const website = await sitesService.createWebsite(req.user.id, req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: `Website registered. Add the verification token to your site, then call the verify endpoint.`,
    data: website,
  });
});

const listWebsites = asyncHandler(async (req, res) => {
  const { status, limit, offset } = req.query;
  const { websites, total } = await sitesService.listWebsites(req.user.id, { status, limit, offset });
  sendSuccess(res, { data: websites, meta: { total, limit, offset } });
});

const getWebsite = asyncHandler(async (req, res) => {
  const website = await sitesService.getWebsite(req.params.id, req.user.id);
  sendSuccess(res, { data: website });
});

const updateWebsite = asyncHandler(async (req, res) => {
  const website = await sitesService.updateWebsite(req.params.id, req.user.id, req.body);
  sendSuccess(res, { message: 'Website updated', data: website });
});

const verifyWebsite = asyncHandler(async (req, res) => {
  const website = await sitesService.verifyWebsite(req.params.id, req.user.id);
  sendSuccess(res, { message: 'Website verified successfully', data: website });
});

const createAdUnit = asyncHandler(async (req, res) => {
  const adUnit = await sitesService.createAdUnit(req.params.id, req.user.id, req.body);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  sendSuccess(res, {
    statusCode: 201,
    message: 'Ad unit created',
    data: { ...adUnit, embedCode: sitesService.getEmbedCode(adUnit, baseUrl) },
  });
});

const listAdUnits = asyncHandler(async (req, res) => {
  const adUnits = await sitesService.listAdUnits(req.params.id, req.user.id);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const withEmbed = adUnits.map((u) => ({ ...u, embedCode: sitesService.getEmbedCode(u, baseUrl) }));
  sendSuccess(res, { data: withEmbed });
});

const pauseAdUnit = asyncHandler(async (req, res) => {
  const adUnit = await sitesService.updateAdUnitStatus(req.params.id, req.params.adUnitId, req.user.id, 'paused');
  sendSuccess(res, { message: 'Ad unit paused', data: adUnit });
});

const resumeAdUnit = asyncHandler(async (req, res) => {
  const adUnit = await sitesService.updateAdUnitStatus(req.params.id, req.params.adUnitId, req.user.id, 'active');
  sendSuccess(res, { message: 'Ad unit resumed', data: adUnit });
});

const deleteAdUnit = asyncHandler(async (req, res) => {
  await sitesService.deleteAdUnit(req.params.id, req.params.adUnitId, req.user.id);
  sendSuccess(res, { message: 'Ad unit deleted' });
});

module.exports = {
  createWebsite,
  listWebsites,
  getWebsite,
  updateWebsite,
  verifyWebsite,
  createAdUnit,
  listAdUnits,
  pauseAdUnit,
  resumeAdUnit,
  deleteAdUnit,
};
