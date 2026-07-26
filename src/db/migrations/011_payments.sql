-- Extends transactions with payment-provider bookkeeping needed for
-- deposits/withdrawals. Kept as a separate migration (rather than
-- editing 003) since 003 already shipped — additive changes only.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20) CHECK (provider IN ('paystack', 'flutterwave', 'bank_transfer', NULL)),
  ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_transactions_provider_reference ON transactions(provider_reference);

-- Withdrawal requests go through an approval-ish flow (publisher requests,
-- funds are held, payout is processed) rather than an instant wallet debit,
-- since payouts involve real bank transfers that can fail after the fact.
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  amount BIGINT NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  provider VARCHAR(20) NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'bank_transfer')),
  destination JSONB NOT NULL, -- bank code, account number, account name (never card/PAN data)

  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'rejected'
  )),
  failure_reason TEXT,

  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
