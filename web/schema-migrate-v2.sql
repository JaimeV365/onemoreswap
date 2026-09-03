-- Run if users/sessions already exist from the first auth schema.
-- npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v2.sql

ALTER TABLE users ADD COLUMN account_role TEXT NOT NULL DEFAULT 'guardian';
ALTER TABLE users ADD COLUMN guardian_confirmed_at TEXT;
ALTER TABLE users ADD COLUMN accepted_terms_at TEXT;
ALTER TABLE users ADD COLUMN accepted_privacy_at TEXT;
ALTER TABLE users ADD COLUMN email_verified_at TEXT;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  age_band TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id);
