-- A publisher can register multiple websites/apps. Each must be verified
-- before it can serve ads — verification proves the publisher actually
-- controls the domain, preventing ad fraud via unauthorized placements.

CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  monthly_traffic_estimate INTEGER,

  verification_method VARCHAR(20) NOT NULL DEFAULT 'meta_tag' CHECK (verification_method IN (
    'meta_tag', 'dns_txt', 'file_upload'
  )),
  verification_token VARCHAR(64) NOT NULL,
  verified_at TIMESTAMPTZ,

  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'verified', 'approved', 'rejected', 'suspended'
  )),
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (publisher_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_websites_publisher_id ON websites(publisher_id);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain);
