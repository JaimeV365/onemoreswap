-- Email verification tokens
-- D1 Console or: npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v4-email.sql

CREATE TABLE IF NOT EXISTS email_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens (expires_at);
