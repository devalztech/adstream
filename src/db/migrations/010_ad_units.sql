-- An ad unit is a specific placement slot on a website (e.g. "sidebar
-- rectangle" or "in-article native"). The embed_key is what the
-- publisher's JavaScript snippet references — it's a public, low-entropy
-- identifier (not a secret), safe to expose in client-side HTML.

CREATE TABLE IF NOT EXISTS ad_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN (
    'banner', 'rectangle', 'leaderboard', 'sidebar', 'native', 'responsive', 'square', 'sticky'
  )),
  width SMALLINT,
  height SMALLINT,

  embed_key VARCHAR(32) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_units_website_id ON ad_units(website_id);
CREATE INDEX IF NOT EXISTS idx_ad_units_embed_key ON ad_units(embed_key);
