const { Router } = require('express');
const controller = require('./publisher-sites.controller');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const schemas = require('./publisher-sites.schema');

const router = Router();

// Publisher-only, same isolation principle as the campaigns module —
// advertisers and admins never manage websites/ad units through this surface.
router.use(requireAuth, requireRole('publisher'));

router.post('/', validate(schemas.createWebsiteSchema), controller.createWebsite);
router.get('/', validate(schemas.listWebsitesQuerySchema, 'query'), controller.listWebsites);
router.get('/:id', controller.getWebsite);
router.patch('/:id', validate(schemas.updateWebsiteSchema), controller.updateWebsite);
router.post('/:id/verify', controller.verifyWebsite);

router.post('/:id/ad-units', validate(schemas.createAdUnitSchema), controller.createAdUnit);
router.get('/:id/ad-units', controller.listAdUnits);
router.post('/:id/ad-units/:adUnitId/pause', controller.pauseAdUnit);
router.post('/:id/ad-units/:adUnitId/resume', controller.resumeAdUnit);
router.delete('/:id/ad-units/:adUnitId', controller.deleteAdUnit);

module.exports = router;
