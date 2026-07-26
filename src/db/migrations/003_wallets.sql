-- Every user gets exactly one wallet (1:1), created on registration.
-- Balance is stored in the smallest currency unit (kobo/cents) as BIGINT
-- to avoid floating-point rounding errors in money math.

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger of every balance-affecting event. This table is append-only in
-- practice (enforced at the service layer, not the DB, to keep this
-- migration simple) — wallets.balance is a derived cache that must always
-- reconcile against SUM(amount) for that wallet.
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL CHECK (type IN (
    'deposit', 'withdrawal', 'campaign_spend', 'publisher_earning', 'refund', 'adjustment'
  )),
  amount BIGINT NOT NULL, -- positive = credit, negative = debit
  balance_after BIGINT NOT NULL,

  reference VARCHAR(100) UNIQUE, -- external payment provider reference
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'reversed'
  )),
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
