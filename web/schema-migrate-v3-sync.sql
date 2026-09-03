-- Cloud sync blobs per collector profile
-- Paste in D1 Console after profiles table exists, or:
--   npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v3-sync.sql

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
