-- Roles are deliberately a fixed small set for AdStream, not a free-form
-- permissions table yet — the master prompt calls for strict separation
-- between advertiser / publisher / admin dashboards, not granular ACLs.
-- A `permissions` table can be added later without breaking this.

CREATE TABLE IF NOT EXISTS roles (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES
  ('advertiser'),
  ('publisher'),
  ('admin')
ON CONFLICT (name) DO NOTHING;
