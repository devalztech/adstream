-- Generic audit trail. `actor_id` is nullable to allow system-initiated
-- events (cron jobs, webhooks) with no human user attached.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL,       -- e.g. 'user.login', 'wallet.withdraw'
  entity_type VARCHAR(50),            -- e.g. 'user', 'wallet', 'campaign'
  entity_id UUID,

  ip_address VARCHAR(45),
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
