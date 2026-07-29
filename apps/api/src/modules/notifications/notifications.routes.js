const { Router } = require('express');
const controller = require('./notifications.controller');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const schemas = require('./notifications.schema');

const router = Router();

router.use(requireAuth);

router.get('/', validate(schemas.listNotificationsQuerySchema, 'query'), controller.list);
router.post('/:id/read', controller.markRead);
router.post('/read-all', controller.markAllRead);

module.exports = router;
