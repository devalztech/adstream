-- Phase 11 (Optimization) audit: these two lookups run on every request
-- to their respective hot paths but weren't covered by an index.

-- Every token refresh does `WHERE refresh_token_hash = $1` — without this,
-- it's a full table scan on sessions, which only gets worse as the
-- platform grows and old sessions accumulate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);

-- The ad-matching query (ad-serving.service.js) filters creatives on
-- (campaign_id, is_active) together — a composite index serves that
-- filter directly instead of falling back to the single-column
-- campaign_id index plus a row-by-row is_active check.
CREATE INDEX IF NOT EXISTS idx_campaign_creatives_campaign_active ON campaign_creatives(campaign_id, is_active) WHERE is_active = true;
