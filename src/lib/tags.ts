import type { Row } from "@libsql/client";
import { getDb } from "@/lib/db";
import { normalizeTag, tagKey } from "@/lib/tagUtils";

export class TagStorageUnavailableError extends Error {
  constructor() {
    super("Group tags are not available until the tag migration is applied.");
    this.name = "TagStorageUnavailableError";
  }
}

export type TagSuggestion = {
  key: string;
  tag: string;
  count: number;
};

export type TagExpressions = {
  tag: string;
  key: string;
  hasKeyColumn: boolean;
};

/**
 * Reads the live schema so the app stays compatible with the existing table
 * until the additive migration in migrations/001_story_tags.sql is applied.
 */
export async function getTagExpressions(): Promise<TagExpressions | null> {
  const result = await getDb().execute("PRAGMA table_info(submissions)");
  const columns = new Set(result.rows.map((row) => String(row.name)));
  if (!columns.has("tag")) return null;

  return {
    tag: "tag",
    key: columns.has("tag_key") ? "tag_key" : "LOWER(tag)",
    hasKeyColumn: columns.has("tag_key"),
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function toSuggestion(row: Row): TagSuggestion | null {
  const tag = normalizeTag(row.tag);
  const key = String(row.tag_key ?? "").toLowerCase();
  if (!tag || !key) return null;
  return { tag, key, count: Math.max(0, Number(row.count) || 0) };
}

export async function listPopularTags(
  limit = 8,
  query?: string
): Promise<TagSuggestion[]> {
  const expressions = await getTagExpressions();
  if (!expressions) return [];

  const clauses = [
    `${expressions.tag} IS NOT NULL`,
    `TRIM(${expressions.tag}) <> ''`,
  ];
  const args: Array<string | number> = [];
  const search = query ? normalizeTag(query) : null;

  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    clauses.push(
      `(${expressions.tag} LIKE ? ESCAPE '\\' OR ${expressions.key} LIKE ? ESCAPE '\\')`
    );
    args.push(pattern, pattern.toLowerCase());
  }

  args.push(Math.max(1, Math.min(20, limit)));

  const result = await getDb().execute({
    sql: `SELECT ${expressions.key} AS tag_key, MIN(${expressions.tag}) AS tag, COUNT(*) AS count
          FROM submissions
          WHERE ${clauses.join(" AND ")}
          GROUP BY ${expressions.key}
          ORDER BY count DESC, tag COLLATE NOCASE ASC
          LIMIT ?`,
    args,
  });

  return result.rows
    .map(toSuggestion)
    .filter((tag): tag is TagSuggestion => tag !== null);
}

/** Reuses the first stored spelling for a case-insensitively matching tag. */
export async function resolveTag(display: string, key = tagKey(display)) {
  const expressions = await getTagExpressions();
  if (!expressions) throw new TagStorageUnavailableError();

  const result = await getDb().execute({
    sql: `SELECT ${expressions.tag} AS tag
          FROM submissions
          WHERE ${expressions.key} = ?
          ORDER BY ${expressions.tag} COLLATE NOCASE ASC
          LIMIT 1`,
    args: [key],
  });

  const existing = normalizeTag(result.rows[0]?.tag);
  return { tag: existing ?? display, key };
}
