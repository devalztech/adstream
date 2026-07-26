-- Tracking tables are intentionally denormalized (storing campaign_id,
-- ad_unit_id, website_id directly rather than joining through creatives)
-- since these are the highest-write-volume tables in the whole system —
-- every ad view/click writes here, so query-time joins are avoided in
-- favor of a few extra columns at write time.

CREATE TABLE IF NOT EXISTS impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creative_id UUID NOT NULL REFERENCES campaign_creatives(id) ON DELETE CASCADE,
  ad_unit_id UUID NOT NULL REFERENCES ad_units(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  cost BIGINT NOT NULL, -- CPM cost charged to the advertiser for this impression

  country VARCHAR(2),
  device VARCHAR(20),
  ip_hash VARCHAR(64),   -- hashed, never raw IP — used for frequency capping / fraud checks
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partitioned-friendly indexes: created_at first, since dashboards mostly
-- query "last N days for campaign X" or "last N days for website Y".
CREATE INDEX IF NOT EXISTS idx_impressions_campaign_created ON impressions(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_website_created ON impressions(website_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_ad_unit_created ON impressions(ad_unit_id, created_at);

CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impression_id UUID REFERENCES impressions(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creative_id UUID NOT NULL REFERENCES campaign_creatives(id) ON DELETE CASCADE,
  ad_unit_id UUID NOT NULL REFERENCES ad_units(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  cost BIGINT NOT NULL, -- CPC cost charged to the advertiser for this click

  country VARCHAR(2),
  device VARCHAR(20),
  ip_hash VARCHAR(64),
  is_suspicious BOOLEAN NOT NULL DEFAULT false, -- flagged by basic fraud checks, not auto-rejected

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_campaign_created ON clicks(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_website_created ON clicks(website_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_ip_hash_created ON clicks(ip_hash, created_at); -- for fraud/frequency checks

CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id UUID REFERENCES clicks(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  value BIGINT, -- optional advertiser-reported conversion value
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversions_campaign_created ON conversions(campaign_id, created_at);
