-- Shared table for both email-verification and password-reset tokens,
-- distinguished by `purpose`. Tokens are stored hashed, single-use
-- (consumed_at), and time-limited.

CREATE TABLE IF NOT EXISTS verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  token_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('email_verify', 'password_reset')),

  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_purpose ON verification_tokens(purpose);
