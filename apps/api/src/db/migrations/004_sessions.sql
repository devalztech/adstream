-- Refresh tokens are stored hashed (never plaintext) so a DB leak doesn't
-- hand out valid sessions. One row per active refresh token — this doubles
-- as a revocation list: delete the row to log a device out.

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  refresh_token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),

  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
