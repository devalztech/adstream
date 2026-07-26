const { z } = require('zod');

const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'];

const creativeSchema = z
  .object({
    type: z.enum(['banner', 'native', 'text', 'video']),
    assetUrl: z.string().url().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    fileSizeBytes: z.number().int().positive().optional(),
    mimeType: z.string().max(50).optional(),
    headline: z.string().max(150).optional(),
    bodyText: z.string().max(500).optional(),
  })
  .refine((c) => (c.type === 'text' ? !!c.headline : c.type === 'native' ? true : !!c.assetUrl), {
    message: 'banner/video creatives require assetUrl; text creatives require a headline',
  });

const createCampaignSchema = z
  .object({
    name: z.string().min(3).max(255),
    totalBudget: z.number().int().positive(),
    dailyBudget: z.number().int().positive().optional(),
    bidAmount: z.number().int().positive(),
    currency: z.string().length(3).default('NGN'),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    targetCountries: z.array(z.string().length(2)).optional().default([]),
    targetDevices: z.array(z.enum(DEVICE_TYPES)).optional().default([]),
    targetCategories: z.array(z.string()).optional().default([]),
    targetOs: z.array(z.string()).optional().default([]),
    frequencyCap: z.number().int().positive().optional(),
    destinationUrl: z.string().url(),
    trackingParams: z.record(z.string()).optional(),
    creatives: z.array(creativeSchema).min(1, 'At least one creative is required'),
  })
  .refine((data) => !data.endDate || new Date(data.endDate) > new Date(data.startDate), {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((data) => !data.dailyBudget || data.dailyBudget <= data.totalBudget, {
    message: 'dailyBudget cannot exceed totalBudget',
    path: ['dailyBudget'],
  });

const updateCampaignSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  totalBudget: z.number().int().positive().optional(),
  dailyBudget: z.number().int().positive().nullable().optional(),
  bidAmount: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  targetCountries: z.array(z.string().length(2)).optional(),
  targetDevices: z.array(z.enum(DEVICE_TYPES)).optional(),
  targetCategories: z.array(z.string()).optional(),
  targetOs: z.array(z.string()).optional(),
  frequencyCap: z.number().int().positive().nullable().optional(),
  destinationUrl: z.string().url().optional(),
  trackingParams: z.record(z.string()).optional(),
});

const addCreativeSchema = creativeSchema;

const listCampaignsQuerySchema = z.object({
  status: z
    .enum(['draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected', 'archived'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  addCreativeSchema,
  listCampaignsQuerySchema,
};
