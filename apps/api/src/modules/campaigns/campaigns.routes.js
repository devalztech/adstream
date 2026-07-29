const { Router } = require('express');
const controller = require('./campaigns.controller');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const schemas = require('./campaigns.schema');

const router = Router();

// Every route in this module is advertiser-only — publishers and admins
// never touch campaign creation/editing through this surface. Admin
// moderation of campaigns (approve/reject) lives in the admin module (Phase 10).
router.use(requireAuth, requireRole('advertiser'));

router.post('/', validate(schemas.createCampaignSchema), controller.create);
router.get('/', validate(schemas.listCampaignsQuerySchema, 'query'), controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id', validate(schemas.updateCampaignSchema), controller.update);

router.post('/:id/submit', controller.submit);
router.post('/:id/pause', controller.pause);
router.post('/:id/resume', controller.resume);
router.post('/:id/archive', controller.archive);
router.post('/:id/duplicate', controller.duplicate);

router.post('/:id/creatives', validate(schemas.addCreativeSchema), controller.addCreative);
router.delete('/:id/creatives/:creativeId', controller.removeCreative);

module.exports = router;
