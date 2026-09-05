-- Presence heartbeats so clients can warn when another device is online.
-- Run once:
--   npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v7-presence.sql

CREATE TABLE IF NOT EXISTS sync_presence (
  device_id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (device_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_presence_profile_seen
  ON sync_presence (profile_id, last_seen);
