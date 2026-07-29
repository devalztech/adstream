const { z } = require('zod');

/**
 * `range` is a friendly preset that maps to a SQL interval server-side
 * (see analytics.service.js) — keeps the API surface simple for a
 * dashboard UI without exposing raw date-math to the client.
 */
const rangeQuerySchema = z.object({
  range: z.enum(['today', '7d', '30d', '90d', 'year']).optional().default('30d'),
});

const campaignAnalyticsQuerySchema = rangeQuerySchema;
const websiteAnalyticsQuerySchema = rangeQuerySchema;
const overviewQuerySchema = rangeQuerySchema;

module.exports = { campaignAnalyticsQuerySchema, websiteAnalyticsQuerySchema, overviewQuerySchema };
