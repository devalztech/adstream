import { z } from 'zod';

/**
 * Mirrors campaigns.schema.js on the backend, including the cross-field
 * rules (dailyBudget <= totalBudget, endDate > startDate) — duplicated
 * intentionally for instant form feedback, but the backend re-validates
 * independently and is authoritative (INTEGRATION_MAP.md). Money fields
 * here are in MAJOR units (naira) since that's what a human types into
 * a form; the API layer converts via toSmallestUnit() right before the
 * request goes out — see the wizard component.
 */
export const creativeFormSchema = z
  .object({
    type: z.enum(['banner', 'native', 'text', 'video']),
    assetUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    headline: z.string().max(150).optional().or(z.literal('')),
    bodyText: z.string().max(500).optional().or(z.literal('')),
  })
  .refine((c) => (c.type === 'text' ? !!c.headline : c.type === 'native' ? true : !!c.assetUrl), {
    message: 'Banner/video creatives need an asset URL; text creatives need a headline',
    path: ['assetUrl'],
  });

export const campaignWizardSchema = z
  .object({
    // Step 1 — details
    name: z.string().min(3, 'At least 3 characters').max(255),

    // Step 2 — creative (single creative for the wizard; more can be added after creation)
    creative: creativeFormSchema,

    // Step 3 — budget (major units — naira, not kobo, in the form)
    totalBudget: z.coerce.number().positive('Enter a budget greater than 0'),
    dailyBudget: z.coerce.number().positive().optional(),
    bidAmount: z.coerce.number().positive('Enter a bid amount greater than 0'),

    // Step 4 — targeting
    targetCountries: z.array(z.string()).default([]),
    targetDevices: z.array(z.enum(['desktop', 'mobile', 'tablet'])).default([]),
    targetCategories: z.array(z.string()).default([]),
    targetOs: z.array(z.string()).default([]),
    destinationUrl: z.string().url('Enter a valid destination URL'),

    // Step 5 — schedule
    startDate: z.string().min(1, 'Choose a start date'),
    endDate: z.string().optional(),
  })
  .refine((data) => !data.dailyBudget || data.dailyBudget <= data.totalBudget, {
    message: 'Daily budget cannot exceed the total budget',
    path: ['dailyBudget'],
  })
  .refine((data) => !data.endDate || new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });

export type CampaignWizardValues = z.infer<typeof campaignWizardSchema>;

export const WIZARD_STEPS = ['Details', 'Creative', 'Budget', 'Targeting', 'Schedule', 'Review'] as const;
