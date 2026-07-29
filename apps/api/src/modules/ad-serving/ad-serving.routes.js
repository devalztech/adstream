const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./ad-serving.controller');
const validate = require('../../middleware/validate');
const schemas = require('./ad-serving.schema');

const router = Router();

// Ad serving is the highest-traffic, fully public surface in the API —
// no auth, and a much higher ceiling than the general API limiter, since
// every legitimate pageview on every publisher site hits this.
const serveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600, // per IP per minute — generous for a browsing user loading many pages/ad slots
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/serve', serveLimiter, validate(schemas.serveQuerySchema, 'query'), controller.serve);
router.get('/click', serveLimiter, validate(schemas.clickQuerySchema, 'query'), controller.click);
router.post('/conversions', validate(schemas.conversionSchema), controller.conversion);

module.exports = router;
