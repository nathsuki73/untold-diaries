import type { Row } from "@libsql/client";
import { getDb } from "@/lib/db";
import {
  getTagExpressions,
  TagStorageUnavailableError,
  type TagExpressions,
} from "@/lib/tags";
import { normalizeTag, tagKey } from "@/lib/tagUtils";

export interface SubmissionSummary {
  id: number;
  name: string;
  message: string;
  from: string | null;
  track: string | null;
  tag: string | null;
  tag_key: string | null;
}

export type SubmissionDetails = SubmissionSummary;

export interface NewSubmission {
  name: string;
  message: string;
  from: string | null;
  track: string | null;
  tag: string;
  tagKey: string;
}

export interface PaginatedSubmissions {
  items: SubmissionSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function summaryColumns(expressions: TagExpressions | null) {
  const tagColumns = expressions
    ? `${expressions.tag} AS tag, ${expressions.key} AS tag_key`
    : `NULL AS tag, NULL AS tag_key`;
  return `id, name, message, "from", track, ${tagColumns}`;
}

function toSummary(row: Row): SubmissionSummary {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    message: String(row.message ?? ""),
    from: row.from ? String(row.from) : null,
    track: row.track ? String(row.track) : null,
    tag: normalizeTag(row.tag),
    tag_key: row.tag_key ? String(row.tag_key).toLowerCase() : null,
  };
}

function paginated(
  items: SubmissionSummary[],
  total: number,
  page: number,
  pageSize: number
): PaginatedSubmissions {
  return {
    items,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function tagFilter(expressions: TagExpressions | null, tag?: string | null) {
  if (!tag) return { clause: null as string | null, args: [] as string[] };
  const key = tagKey(normalizeTag(tag) ?? "");
  if (!key) return { clause: "1 = 0", args: [] };
  if (!expressions) return { clause: "1 = 0", args: [] };
  return { clause: `${expressions.key} = ?`, args: [key] };
}

export async function listSubmissions(
  page: number,
  pageSize: number,
  tag?: string | null
): Promise<PaginatedSubmissions> {
  const db = getDb();
  const expressions = await getTagExpressions();
  const filter = tagFilter(expressions, tag);
  const where = filter.clause ? `WHERE ${filter.clause}` : "";
  const columns = summaryColumns(expressions);

  const [count, rows] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) AS total FROM submissions ${where}`,
      args: filter.args,
    }),
    db.execute({
      sql: `SELECT ${columns} FROM submissions ${where}
            ORDER BY id DESC LIMIT ? OFFSET ?`,
      args: [...filter.args, pageSize, (page - 1) * pageSize],
    }),
  ]);
  const total = Number(count.rows[0]?.total ?? 0);

  return paginated(rows.rows.map(toSummary), total, page, pageSize);
}

export async function randomSubmissions(limit: number) {
  const db = getDb();
  const expressions = await getTagExpressions();
  const result = await db.execute({
    sql: `SELECT ${summaryColumns(expressions)} FROM submissions ORDER BY RANDOM() LIMIT ?`,
    args: [limit],
  });
  return result.rows.map(toSummary);
}

// Case-insensitive match on the recipient's name, longest messages first,
// with an optional single group tag. Paging and filtering happen in the
// database so Browse never loads untagged or unrelated rows into the browser.
export async function searchSubmissions(
  query: string,
  page: number,
  pageSize: number,
  tag?: string | null
): Promise<PaginatedSubmissions> {
  const db = getDb();
  const expressions = await getTagExpressions();
  const clauses = [`name LIKE ? ESCAPE '\\'`];
  const args: Array<string | number> = [
    `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
  ];

  const filter = tagFilter(expressions, tag);
  if (filter.clause) {
    clauses.push(filter.clause);
    args.push(...filter.args);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;

  const [count, rows] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS total FROM submissions ${where}`, args }),
    db.execute({
      sql: `SELECT ${summaryColumns(expressions)} FROM submissions ${where}
            ORDER BY LENGTH(message) DESC, id DESC
            LIMIT ? OFFSET ?`,
      args: [...args, pageSize, (page - 1) * pageSize],
    }),
  ]);
  const total = Number(count.rows[0]?.total ?? 0);

  return paginated(rows.rows.map(toSummary), total, page, pageSize);
}

export async function getSubmission(
  id: number
): Promise<SubmissionDetails | null> {
  const expressions = await getTagExpressions();
  const result = await getDb().execute({
    sql: `SELECT ${summaryColumns(expressions)} FROM submissions WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  return toSummary(row);
}

export async function createSubmission(
  data: NewSubmission
): Promise<number> {
  const expressions = await getTagExpressions();
  if (!expressions) throw new TagStorageUnavailableError();

  const columns = `name, message, "from", track, tag`;
  const placeholders = `?, ?, ?, ?, ?`;
  const args: Array<string | null> = [
    data.name,
    data.message,
    data.from,
    data.track,
    data.tag,
  ];

  if (expressions.hasKeyColumn) {
    const insert = `INSERT INTO submissions (${columns}, tag_key)
                    VALUES (${placeholders}, ?)`;
    const result = await getDb().execute({ sql: insert, args: [...args, data.tagKey] });
    return Number(result.lastInsertRowid);
  }

  const result = await getDb().execute({
    sql: `INSERT INTO submissions (${columns}) VALUES (${placeholders})`,
    args,
  });
  return Number(result.lastInsertRowid);
}
