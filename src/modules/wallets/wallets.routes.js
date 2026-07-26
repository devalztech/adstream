const { Router } = require('express');
const controller = require('./wallets.controller');
const { requireAuth } = require('../../middleware/auth');

const router = Router();

// Deposit/withdrawal endpoints are intentionally not here yet — they
// require a real payment provider integration (Paystack/Flutterwave),
// which is Phase 5 (Wallet system) / Phase 8 (Payments) per the plan.
// Phase 1 exposes read access so the frontend can be built against it now.
router.get('/me', requireAuth, controller.getMyWallet);
router.get('/me/transactions', requireAuth, controller.getMyTransactions);

module.exports = router;
