-- Anonymous share links (spares / needs only — no identity)
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
