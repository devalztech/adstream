const { Router } = require('express');
const controller = require('./payments.controller');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const schemas = require('./payments.schema');

const router = Router();

// Deposits are for funding a wallet — either role can do this
// (advertisers fund campaigns; a publisher could top up too, e.g. to
// pay for a premium account per the blueprint's revenue model).
router.post('/deposit', requireAuth, validate(schemas.initiateDepositSchema), controller.deposit);
router.get('/deposit/verify', requireAuth, controller.verifyDeposit);

// Withdrawals cash out earnings — publisher-only. An advertiser wallet
// only ever holds funds they deposited to spend on campaigns; letting
// them "withdraw" would just be undoing a deposit through the payout
// rail, which isn't a flow the blueprint calls for.
router.post('/withdraw', requireAuth, requireRole('publisher'), validate(schemas.requestWithdrawalSchema), controller.withdraw);
router.get('/withdrawals', requireAuth, requireRole('publisher'), controller.listWithdrawals);

// Webhook routes are intentionally NOT behind requireAuth — providers call
// these directly and authenticate via signature, not a user session.
// Raw-body parsing for these two paths is registered in app.js, ahead of
// the global express.json() middleware, so signature verification sees
// the exact bytes the provider signed.
router.post('/webhooks/paystack', controller.paystackWebhook);
router.post('/webhooks/flutterwave', controller.flutterwaveWebhook);

module.exports = router;
