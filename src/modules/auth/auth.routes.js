const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiter');
const schemas = require('./auth.schema');

const router = Router();

router.post('/register', authLimiter, validate(schemas.registerSchema), controller.register);
router.post('/login', authLimiter, validate(schemas.loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/verify-email', validate(schemas.verifyEmailSchema), controller.verifyEmail);
router.post('/forgot-password', authLimiter, validate(schemas.forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(schemas.resetPasswordSchema), controller.resetPassword);

module.exports = router;
