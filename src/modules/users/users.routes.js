const { Router } = require('express');
const controller = require('./users.controller');
const { requireAuth } = require('../../middleware/auth');

const router = Router();

// All routes here require a valid access token — this module never
// exposes other users' data, only the authenticated user's own profile.
router.get('/me', requireAuth, controller.getMe);
router.patch('/me', requireAuth, controller.updateMe);

module.exports = router;
