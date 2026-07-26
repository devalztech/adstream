const { z } = require('zod');

const AD_FORMATS = [
  'banner', 'rectangle', 'leaderboard', 'sidebar', 'native', 'responsive', 'square', 'sticky',
];

// Strips protocol/path/www so publishers can paste a full URL or a bare
// domain and both normalize to the same stored value.
function normalizeDomain(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

const domainSchema = z
  .string()
  .min(3)
  .max(255)
  .transform(normalizeDomain)
  .refine((d) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d), {
    message: 'Must be a valid domain (e.g. example.com)',
  });

const createWebsiteSchema = z.object({
  name: z.string().min(2).max(255),
  domain: domainSchema,
  category: z.string().max(100).optional(),
  language: z.string().max(10).optional().default('en'),
  monthlyTrafficEstimate: z.number().int().nonnegative().optional(),
  verificationMethod: z.enum(['meta_tag', 'dns_txt', 'file_upload']).optional().default('meta_tag'),
});

const updateWebsiteSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  category: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  monthlyTrafficEstimate: z.number().int().nonnegative().optional(),
});

const createAdUnitSchema = z.object({
  name: z.string().min(2).max(255),
  format: z.enum(AD_FORMATS),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const listWebsitesQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'approved', 'rejected', 'suspended']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  createWebsiteSchema,
  updateWebsiteSchema,
  createAdUnitSchema,
  listWebsitesQuerySchema,
};
