-- Contacts (Tier 1) — run on existing D1:
--   npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v6-contacts.sql
-- Or paste into Dashboard → D1 → Console.

CREATE TABLE IF NOT EXISTS contact_invites (
  code TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  accepted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_contact_invites_from ON contact_invites (from_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_invites_expires ON contact_invites (expires_at);

-- Ordered pair so each friendship is one row (user_low < user_high)
CREATE TABLE IF NOT EXISTS contacts (
  user_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_low, user_high)
);

CREATE INDEX IF NOT EXISTS idx_contacts_high ON contacts (user_high);
