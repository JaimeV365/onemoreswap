-- Paste into Cloudflare Dashboard → D1 → onemoreswap → Console → Run
-- (Use this if wrangler login is awkward on your PC.)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  account_role TEXT NOT NULL DEFAULT 'guardian',
  guardian_confirmed_at TEXT,
  accepted_terms_at TEXT,
  accepted_privacy_at TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  age_band TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id);

CREATE TABLE IF NOT EXISTS profile_sync (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_json TEXT NOT NULL DEFAULT '{}',
  postal_json TEXT NOT NULL DEFAULT '{}',
  sources_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_user ON profile_sync (user_id);

CREATE TABLE IF NOT EXISTS email_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens (expires_at);

CREATE TABLE IF NOT EXISTS share_links (
  token TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links (expires_at);
CREATE INDEX IF NOT EXISTS idx_share_links_owner ON share_links (owner_user_id);

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

CREATE TABLE IF NOT EXISTS contacts (
  user_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_low, user_high)
);

CREATE INDEX IF NOT EXISTS idx_contacts_high ON contacts (user_high);
