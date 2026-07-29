const campaignsService = require('./campaigns.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.createCampaign(req.user.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Campaign created as draft', data: campaign });
});

const list = asyncHandler(async (req, res) => {
  const { status, limit, offset } = req.query;
  const { campaigns, total } = await campaignsService.listCampaigns(req.user.id, { status, limit, offset });
  sendSuccess(res, { data: campaigns, meta: { total, limit, offset } });
});

const getOne = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.getCampaign(req.params.id, req.user.id);
  sendSuccess(res, { data: campaign });
});

const update = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.updateCampaign(req.params.id, req.user.id, req.body);
  sendSuccess(res, { message: 'Campaign updated', data: campaign });
});

const submit = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.submitForApproval(req.params.id, req.user.id);
  sendSuccess(res, { message: 'Campaign submitted for approval', data: campaign });
});

const pause = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.transitionStatus('pause', req.params.id, req.user.id);
  sendSuccess(res, { message: 'Campaign paused', data: campaign });
});

const resume = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.transitionStatus('resume', req.params.id, req.user.id);
  sendSuccess(res, { message: 'Campaign resumed', data: campaign });
});

const archive = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.transitionStatus('archive', req.params.id, req.user.id);
  sendSuccess(res, { message: 'Campaign archived', data: campaign });
});

const duplicate = asyncHandler(async (req, res) => {
  const campaign = await campaignsService.duplicateCampaign(req.params.id, req.user.id);
  sendSuccess(res, { statusCode: 201, message: 'Campaign duplicated as draft', data: campaign });
});

const addCreative = asyncHandler(async (req, res) => {
  const creative = await campaignsService.addCreative(req.params.id, req.user.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Creative added', data: creative });
});

const removeCreative = asyncHandler(async (req, res) => {
  await campaignsService.removeCreative(req.params.id, req.params.creativeId, req.user.id);
  sendSuccess(res, { message: 'Creative removed' });
});

module.exports = { create, list, getOne, update, submit, pause, resume, archive, duplicate, addCreative, removeCreative };
