const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const REFRESH_COOKIE_NAME = 'adstream_refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/v1/auth', // only sent to auth endpoints
};

function requestContext(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Account created. Please verify your email to continue.',
    data: user,
  });
});

const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body, requestContext(req));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, { message: 'Login successful', data: { accessToken, user } });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  const { accessToken, refreshToken, user } = await authService.refresh(token, requestContext(req));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, { message: 'Token refreshed', data: { accessToken, user } });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  sendSuccess(res, { message: 'Logged out successfully' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  sendSuccess(res, { message: 'Email verified successfully' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: 'If an account exists for this email, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, { message: 'Password reset successfully. Please log in again.' });
});

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword };
