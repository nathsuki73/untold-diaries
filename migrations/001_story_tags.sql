-- Additive migration for single story tags.
-- Safe to run once against the existing submissions table. It adds columns and
-- an index only; no existing story rows are changed or deleted.
--
-- Existing stories remain untagged and continue to appear in "All Stories".

ALTER TABLE submissions ADD COLUMN tag TEXT;
ALTER TABLE submissions ADD COLUMN tag_key TEXT;

CREATE INDEX IF NOT EXISTS idx_submissions_tag_key ON submissions(tag_key);

-- Rollback note: SQLite cannot drop columns with a simple statement. If this
-- migration must be undone, recreate the submissions table without these
-- columns and copy the original columns back. Do that only with a backup.
