/**
 * Every money value from the API is an integer in the smallest currency
 * unit (kobo for NGN) — see INTEGRATION_MAP.md. These helpers are for
 * DISPLAY ONLY. Never add/subtract/multiply the *formatted* (divided)
 * value for anything that matters — always do arithmetic on the raw
 * integer the API gave you, and only divide by 100 at the last step,
 * right before rendering.
 */

const CURRENCY_LOCALE: Record<string, string> = {
  NGN: 'en-NG',
};

/**
 * Formats an integer smallest-unit amount (e.g. 150000 kobo) as a
 * display string (e.g. "₦1,500.00"). Purely presentational — the
 * division by 100 here must never feed back into a calculation.
 */
export function formatMoney(amountInSmallestUnit: number, currency = 'NGN'): string {
  const major = amountInSmallestUnit / 100;
  const locale = CURRENCY_LOCALE[currency] ?? 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    // Unknown currency code — fall back to a plain number with the code
    // appended rather than throwing and breaking the page.
    return `${major.toFixed(2)} ${currency}`;
  }
}

/**
 * Converts a user-entered major-unit amount (e.g. "1500.00" naira typed
 * into a form) into the integer smallest-unit value the API expects.
 * This is the one place float math is unavoidable (parsing user input) —
 * rounding immediately after multiplying prevents float drift like
 * 1500.1 * 100 = 150009.99999999998.
 */
export function toSmallestUnit(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}
