-- Tracked, internal-only destinations used by website Story sharing.
CREATE TABLE IF NOT EXISTS story_shares (
  token TEXT PRIMARY KEY,
  story_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clicks INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_story_shares_story_id
  ON story_shares(story_id);
