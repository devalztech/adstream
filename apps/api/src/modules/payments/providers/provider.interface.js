/**
 * Every payment provider adapter must implement this shape:
 *
 *   initializeDeposit({ amount, currency, email, reference, callbackUrl })
 *     -> { authorizationUrl, reference }
 *
 *   verifyDeposit(reference)
 *     -> { status: 'success' | 'failed' | 'pending', amount, currency, reference }
 *
 *   initiateTransfer({ amount, currency, destination, reference })
 *     -> { status: 'success' | 'pending' | 'failed', providerReference }
 *
 *   verifyWebhookSignature(rawBody, signatureHeader)
 *     -> boolean
 *
 * New providers (bank transfer, crypto) plug in by adding a file here
 * and registering it in providers/index.js — nothing in wallets.service
 * or the controller needs to change.
 */
module.exports = {}; // documentation-only module, no runtime export needed
