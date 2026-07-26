const { Router } = require('express');
const controller = require('./admin.controller');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const schemas = require('./admin.schema');

const router = Router();

// Every route in this module requires the admin role — this is the
// strictest boundary in the whole API. Admin accounts are never
// self-registrable (see auth module), so reaching this middleware at
// all already implies deliberate, out-of-band account provisioning.
router.use(requireAuth, requireRole('admin'));

router.get('/overview', controller.platformOverview);

router.get('/campaigns/pending', validate(schemas.listQuerySchema, 'query'), controller.listPendingCampaigns);
router.post('/campaigns/:id/approve', controller.approveCampaign);
router.post('/campaigns/:id/reject', validate(schemas.rejectCampaignSchema), controller.rejectCampaign);

router.get('/websites/pending', validate(schemas.listQuerySchema, 'query'), controller.listPendingWebsites);
router.post('/websites/:id/approve', controller.approveWebsite);
router.post('/websites/:id/reject', validate(schemas.rejectWebsiteSchema), controller.rejectWebsite);
router.post('/websites/:id/suspend', validate(schemas.suspendWebsiteSchema), controller.suspendWebsite);

router.get('/withdrawals/pending', validate(schemas.listQuerySchema, 'query'), controller.listPendingWithdrawals);
router.post('/withdrawals/:id/process', controller.processWithdrawal);

router.get('/users', validate(schemas.listUsersQuerySchema, 'query'), controller.listUsers);
router.post('/users/:id/suspend', validate(schemas.userActionSchema), controller.suspendUser);
router.post('/users/:id/reactivate', controller.reactivateUser);
router.post('/users/:id/wallet/adjust', validate(schemas.adjustWalletSchema), controller.adjustUserWallet);

module.exports = router;
