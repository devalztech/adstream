-- Campaigns belong to an advertiser (a user with role 'advertiser').
-- Budgets are stored as BIGINT in the smallest currency unit, same
-- convention as wallets.balance, to keep money math consistent
-- and avoid float rounding errors across the whole schema.

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected', 'archived'
  )),

  -- Budget
  total_budget BIGINT NOT NULL CHECK (total_budget > 0),
  daily_budget BIGINT CHECK (daily_budget IS NULL OR daily_budget > 0),
  bid_amount BIGINT NOT NULL CHECK (bid_amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  spent_amount BIGINT NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),

  -- Scheduling
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,

  -- Targeting — stored as arrays for simple "matches any" filtering.
  -- A dedicated targeting-rules table can replace this later if targeting
  -- logic needs to grow beyond simple inclusion lists (e.g. exclusions,
  -- weighted targeting) without touching the rest of the schema.
  target_countries TEXT[] DEFAULT '{}',
  target_devices VARCHAR(20)[] DEFAULT '{}',  -- 'desktop', 'mobile', 'tablet'
  target_categories TEXT[] DEFAULT '{}',
  target_os VARCHAR(20)[] DEFAULT '{}',

  frequency_cap SMALLINT,          -- max impressions per user per day, null = uncapped
  destination_url TEXT NOT NULL,
  tracking_params JSONB,

  rejection_reason TEXT,           -- set by admin when status = 'rejected'
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
