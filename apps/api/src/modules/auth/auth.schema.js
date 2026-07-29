const { z } = require('zod');

const registerSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['advertiser', 'publisher']), // admin accounts are never self-registered
  companyName: z.string().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
};
