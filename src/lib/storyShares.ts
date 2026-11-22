import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

let ensureTablePromise: Promise<void> | null = null;

/**
 * Shares live in the existing libSQL database. The table is additive and
 * created on demand so the feature also works before the migration is run.
 */
async function ensureTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = getDb()
      .execute(
        `CREATE TABLE IF NOT EXISTS story_shares (
           token TEXT PRIMARY KEY,
           story_id INTEGER NOT NULL,
           created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           clicks INTEGER NOT NULL DEFAULT 0
         )`
      )
      .then(() =>
        getDb().execute(
          `CREATE INDEX IF NOT EXISTS idx_story_shares_story_id
           ON story_shares(story_id)`
        )
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        ensureTablePromise = null;
        throw error;
      });
  }
  await ensureTablePromise;
}

export function isValidShareToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** Creates an opaque, internal-only share token for a public story. */
export async function createStoryShare(storyId: number): Promise<string> {
  if (!Number.isInteger(storyId) || storyId < 1) {
    throw new Error("Invalid story ID");
  }

  await ensureTable();
  const token = randomBytes(16).toString("base64url");
  await getDb().execute({
    sql: "INSERT INTO story_shares (token, story_id) VALUES (?, ?)",
    args: [token, storyId],
  });
  return token;
}

/** Resolves a token strictly to a local story ID. Never accepts a URL. */
export async function getStoryShareStoryId(
  token: string
): Promise<number | null> {
  if (!isValidShareToken(token)) return null;

  await ensureTable();
  const result = await getDb().execute({
    sql: "SELECT story_id FROM story_shares WHERE token = ?",
    args: [token],
  });
  const storyId = Number(result.rows[0]?.story_id);
  return Number.isInteger(storyId) && storyId > 0 ? storyId : null;
}

/** Best-effort analytics; a failed write must not block the redirect. */
export async function recordStoryShareClick(token: string): Promise<void> {
  if (!isValidShareToken(token)) return;

  await ensureTable();
  await getDb().execute({
    sql: "UPDATE story_shares SET clicks = clicks + 1 WHERE token = ?",
    args: [token],
  });
}
