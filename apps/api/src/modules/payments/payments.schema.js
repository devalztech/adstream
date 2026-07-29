const { z } = require('zod');

const PROVIDERS = ['paystack', 'flutterwave'];

const initiateDepositSchema = z.object({
  amount: z.number().int().positive(), // smallest currency unit (kobo)
  provider: z.enum(PROVIDERS),
});

const requestWithdrawalSchema = z.object({
  amount: z.number().int().positive(),
  provider: z.enum(PROVIDERS),
  destination: z.object({
    accountNumber: z.string().min(6).max(20),
    accountName: z.string().min(2).max(255),
    bankCode: z.string().min(2).max(10),
  }),
});

module.exports = { initiateDepositSchema, requestWithdrawalSchema };
