const { Router } = require('express');
const controller = require('./analytics.controller');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const schemas = require('./analytics.schema');

const router = Router();

router.get(
  '/advertiser/overview',
  requireAuth,
  requireRole('advertiser'),
  validate(schemas.overviewQuerySchema, 'query'),
  controller.advertiserOverview
);
router.get(
  '/campaigns/:id',
  requireAuth,
  requireRole('advertiser'),
  validate(schemas.campaignAnalyticsQuerySchema, 'query'),
  controller.campaignAnalytics
);

router.get(
  '/publisher/overview',
  requireAuth,
  requireRole('publisher'),
  validate(schemas.overviewQuerySchema, 'query'),
  controller.publisherOverview
);
router.get(
  '/websites/:id',
  requireAuth,
  requireRole('publisher'),
  validate(schemas.websiteAnalyticsQuerySchema, 'query'),
  controller.websiteAnalytics
);

module.exports = router;
