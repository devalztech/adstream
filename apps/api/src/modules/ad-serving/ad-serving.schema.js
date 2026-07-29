const { z } = require('zod');

const serveQuerySchema = z.object({
  unit: z.string().min(1), // ad_units.embed_key
  country: z.string().length(2).optional(),
  device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  os: z.string().max(20).optional(),
});

const clickQuerySchema = z.object({
  imp: z.string().uuid(), // impression id, returned by /serve
});

const conversionSchema = z.object({
  clickId: z.string().uuid(),
  value: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});

module.exports = { serveQuerySchema, clickQuerySchema, conversionSchema };
