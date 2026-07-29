const crypto = require('crypto');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../config/logger');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const secretKey = process.env.PAYSTACK_SECRET_KEY;

function assertConfigured() {
  if (!secretKey) {
    throw ApiError.internal('Paystack is not configured on this server (missing PAYSTACK_SECRET_KEY)');
  }
}

async function paystackFetch(path, options = {}) {
  assertConfigured();
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const json = await response.json();
  if (!response.ok || json.status === false) {
    logger.warn('Paystack API error', { path, message: json.message });
    throw ApiError.badRequest(json.message || 'Payment provider request failed');
  }
  return json.data;
}

/** Paystack amounts are in kobo already — matches our BIGINT smallest-unit convention. */
async function initializeDeposit({ amount, email, reference, callbackUrl }) {
  const data = await paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ amount, email, reference, callback_url: callbackUrl }),
  });
  return { authorizationUrl: data.authorization_url, reference: data.reference };
}

async function verifyDeposit(reference) {
  const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  const statusMap = { success: 'success', failed: 'failed', abandoned: 'failed' };
  return {
    status: statusMap[data.status] || 'pending',
    amount: data.amount,
    currency: data.currency,
    reference: data.reference,
  };
}

/**
 * Transfers require a Paystack "transfer recipient" to be created first,
 * then a transfer initiated against it. Combined here into one call since
 * AdStream doesn't need to reuse recipients across multiple payouts yet.
 */
async function initiateTransfer({ amount, destination, reference }) {
  const recipient = await paystackFetch('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: destination.accountName,
      account_number: destination.accountNumber,
      bank_code: destination.bankCode,
      currency: 'NGN',
    }),
  });

  const transfer = await paystackFetch('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount,
      recipient: recipient.recipient_code,
      reference,
      reason: 'AdStream publisher withdrawal',
    }),
  });

  const statusMap = { success: 'success', pending: 'pending', otp: 'pending' };
  return {
    status: statusMap[transfer.status] || 'failed',
    providerReference: transfer.reference || reference,
  };
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!secretKey || !signatureHeader) return false;
  const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  return hash === signatureHeader;
}

module.exports = { initializeDeposit, verifyDeposit, initiateTransfer, verifyWebhookSignature };
