const ApiError = require('../../../utils/ApiError');
const paystack = require('./paystack.provider');
const flutterwave = require('./flutterwave.provider');

/**
 * The only place that maps a provider name to an implementation.
 * wallets/payments controllers and services call getProvider(name) and
 * never import paystack.provider or flutterwave.provider directly —
 * adding a third provider means adding one file plus one line here.
 */
const providers = {
  paystack,
  flutterwave,
};

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw ApiError.badRequest(`Unsupported payment provider: ${name}. Supported: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}

module.exports = { getProvider, providers };
