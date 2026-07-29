const { z } = require('zod');

const rejectCampaignSchema = z.object({
  reason: z.string().min(3).max(1000),
});

const rejectWebsiteSchema = z.object({
  reason: z.string().min(3).max(1000),
});

const suspendWebsiteSchema = z.object({
  reason: z.string().min(3).max(1000),
});

const listUsersQuerySchema = z.object({
  role: z.enum(['advertiser', 'publisher', 'admin']).optional(),
  search: z.string().max(255).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const userActionSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const adjustWalletSchema = z.object({
  amount: z.number().int(), // positive = credit, negative = debit — admin-initiated correction
  reason: z.string().min(3).max(1000),
});

module.exports = {
  rejectCampaignSchema,
  rejectWebsiteSchema,
  suspendWebsiteSchema,
  listUsersQuerySchema,
  listQuerySchema,
  userActionSchema,
  adjustWalletSchema,
};
