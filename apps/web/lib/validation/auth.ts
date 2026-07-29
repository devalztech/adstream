import { z } from 'zod';

/**
 * Mirrors the backend's zod schemas exactly (auth.schema.js) so a
 * frontend validation failure and a backend one never disagree about
 * what's valid. Frontend validation is for UX (instant feedback);
 * the backend remains authoritative — see INTEGRATION_MAP.md.
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name').max(255),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Must be at least 8 characters').max(100),
    confirmPassword: z.string(),
    role: z.enum(['advertiser', 'publisher'], { required_error: 'Choose an account type' }),
    companyName: z.string().max(255).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Must be at least 8 characters').max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
