const walletsService = require('./wallets.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await walletsService.getWallet(req.user.id);
  sendSuccess(res, { data: wallet });
});

const getMyTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const transactions = await walletsService.getTransactions(req.user.id, { limit, offset });
  sendSuccess(res, { data: transactions, meta: { limit, offset } });
});

module.exports = { getMyWallet, getMyTransactions };
