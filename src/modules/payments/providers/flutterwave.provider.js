const crypto = require('crypto');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../config/logger');

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';
const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

function assertConfigured() {
  if (!secretKey) {
    throw ApiError.internal('Flutterwave is not configured on this server (missing FLUTTERWAVE_SECRET_KEY)');
  }
}

async function flwFetch(path, options = {}) {
  assertConfigured();
  const response = await fetch(`${FLW_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const json = await response.json();
  if (!response.ok || json.status === 'error') {
    logger.warn('Flutterwave API error', { path, message: json.message });
    throw ApiError.badRequest(json.message || 'Payment provider request failed');
  }
  return json.data;
}

/**
 * Flutterwave amounts are in the currency's major unit (e.g. naira, not
 * kobo) — unlike Paystack. This adapter converts at the boundary so the
 * rest of the app never has to think about per-provider unit differences.
 */
async function initializeDeposit({ amount, currency, email, reference, callbackUrl }) {
  const data = await flwFetch('/payments', {
    method: 'POST',
    body: JSON.stringify({
      tx_ref: reference,
      amount: (amount / 100).toFixed(2),
      currency: currency || 'NGN',
      redirect_url: callbackUrl,
      customer: { email },
    }),
  });
  return { authorizationUrl: data.link, reference };
}

async function verifyDeposit(reference) {
  const data = await flwFetch(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);
  const statusMap = { successful: 'success', failed: 'failed' };
  return {
    status: statusMap[data.status] || 'pending',
    amount: Math.round(data.amount * 100), // back to smallest unit
    currency: data.currency,
    reference: data.tx_ref,
  };
}

async function initiateTransfer({ amount, currency, destination, reference }) {
  const data = await flwFetch('/transfers', {
    method: 'POST',
    body: JSON.stringify({
      account_bank: destination.bankCode,
      account_number: destination.accountNumber,
      amount: amount / 100,
      currency: currency || 'NGN',
      reference,
      narration: 'AdStream publisher withdrawal',
    }),
  });
  const statusMap = { NEW: 'pending', SUCCESSFUL: 'success', FAILED: 'failed' };
  return {
    status: statusMap[data.status] || 'pending',
    providerReference: String(data.id || reference),
  };
}

/** Flutterwave sends a static verif-hash header matching a value you set in the dashboard. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!webhookHash || !signatureHeader) return false;
  // Constant-time comparison to avoid timing side-channels.
  const a = Buffer.from(webhookHash);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { initializeDeposit, verifyDeposit, initiateTransfer, verifyWebhookSignature };
