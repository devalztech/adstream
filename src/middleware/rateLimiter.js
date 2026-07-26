const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * General API rate limit — generous, just a backstop against abuse.
 */
const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Tighter limit for auth endpoints (login, register, password reset)
 * to slow down credential-stuffing and brute-force attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

module.exports = { generalLimiter, authLimiter };
