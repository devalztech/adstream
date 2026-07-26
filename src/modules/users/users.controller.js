const usersService = require('./users.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getMe = asyncHandler(async (req, res) => {
  const profile = await usersService.getProfile(req.user.id);
  sendSuccess(res, { data: profile });
});

const updateMe = asyncHandler(async (req, res) => {
  const updated = await usersService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { message: 'Profile updated', data: updated });
});

module.exports = { getMe, updateMe };
