const paymentsService = require('./payments.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

const deposit = asyncHandler(async (req, res) => {
  const result = await paymentsService.initiateDeposit(req.user.id, req.user.email, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Deposit initialized', data: result });
});

const verifyDeposit = asyncHandler(async (req, res) => {
  const { reference, provider } = req.query;
  if (!reference || !provider) throw ApiError.badRequest('reference and provider query params are required');
  const result = await paymentsService.verifyDeposit(reference, provider);
  sendSuccess(res, { message: `Deposit ${result.status}`, data: result });
});

const withdraw = asyncHandler(async (req, res) => {
  const withdrawal = await paymentsService.requestWithdrawal(req.user.id, req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Withdrawal request submitted and is pending processing',
    data: withdrawal,
  });
});

const listWithdrawals = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const withdrawals = await paymentsService.listMyWithdrawals(req.user.id, { limit, offset });
  sendSuccess(res, { data: withdrawals, meta: { limit, offset } });
});

/**
 * Webhook handlers receive the raw body (see routes.js — mounted with
 * express.raw() before JSON parsing) because signature verification
 * needs the exact bytes the provider signed, not a re-serialized object.
 */
const paystackWebhook = asyncHandler(async (req, res) => {
  await paymentsService.handleWebhook('paystack', req.body, req.headers['x-paystack-signature']);
  res.status(200).send('ok');
});

const flutterwaveWebhook = asyncHandler(async (req, res) => {
  await paymentsService.handleWebhook('flutterwave', req.body, req.headers['verif-hash']);
  res.status(200).send('ok');
});

module.exports = { deposit, verifyDeposit, withdraw, listWithdrawals, paystackWebhook, flutterwaveWebhook };
