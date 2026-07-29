-- A campaign can have multiple creatives (e.g. different banner sizes,
-- or A/B variants). The actual file bytes live in S3-compatible object
-- storage per the architecture plan — this table stores the resulting
-- URL plus metadata needed to serve and validate the creative, not the
-- file itself.

CREATE TABLE IF NOT EXISTS campaign_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL CHECK (type IN ('banner', 'native', 'text', 'video')),

  -- For banner/video creatives
  asset_url TEXT,
  width SMALLINT,
  height SMALLINT,
  file_size_bytes INTEGER,
  mime_type VARCHAR(50),

  -- For text/native creatives
  headline VARCHAR(150),
  body_text VARCHAR(500),

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (type = 'text' AND headline IS NOT NULL) OR
    (type != 'text' AND asset_url IS NOT NULL) OR
    (type = 'native')
  )
);

CREATE INDEX IF NOT EXISTS idx_campaign_creatives_campaign_id ON campaign_creatives(campaign_id);
