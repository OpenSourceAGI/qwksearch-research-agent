/**
 * @fileoverview A {@link VideoLibraryStore} over Cloudflare D1 (or anything
 * that speaks D1's `prepare().bind().all()` API — `node:sqlite` and
 * `bun:sqlite` wrap to it in a few lines, which is how the test suite runs it).
 *
 * Plain SQL rather than an ORM, so the package takes on no database
 * dependency and a host app can point it at its own D1 binding.
 *
 * Two D1 limits shape the queries:
 *
 * - **At most 100 bound parameters per statement.** An id allow-list (a
 *   favourites list, a watch history) can be longer than that, so lists of ids
 *   are bound as **one** JSON string and expanded with `json_each` in SQL
 *   rather than as `IN (?, ?, …)`.
 * - **No multi-statement `prepare`.** The schema is applied one statement at a
 *   time by {@link D1LibraryStore.ensureSchema}.
 *
 * Tags and custom field values are stored as JSON text. The derived columns
 * (`published_ms`, `search_text`) are computed in JS before a row reaches this
 * file, exactly as for every other store.
 */

import { clampLimit } from '../query';
import type { LibraryRowUpdate, VideoLibraryStore } from '../store';
import type { LibraryExclusion, LibraryPage, LibraryQuery, LibraryVideo, VideoAvailability } from '../types';

/** The slice of D1's `D1PreparedStatement` this store uses. */
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

/** The slice of D1's `D1Database` this store uses. `batch` is used when present. */
export interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
  batch?(statements: D1StatementLike[]): Promise<unknown>;
}

export interface D1LibraryStoreOptions {
  /**
   * Prefix for the two tables (`<prefix>videos`, `<prefix>video_exclusions`),
   * so the library can share a database with the host app. Default `eyt_`.
   */
  tablePrefix?: string;
}

export interface D1LibraryStore extends VideoLibraryStore {
  /** Creates the tables and indexes if they don't exist. Idempotent; cheap to call per cold start. */
  ensureSchema(): Promise<void>;
}

/**
 * The schema, as individual statements. Also useful as a migration file:
 * `librarySchemaSql().join(';\n') + ';'`.
 */
export function librarySchemaSql(tablePrefix = 'eyt_'): string[] {
  const t = tableNames(tablePrefix);
  return [
    `CREATE TABLE IF NOT EXISTS ${t.videos} (
  video_id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  view_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  availability TEXT NOT NULL DEFAULT 'available',
  stack_key TEXT,
  stack_position INTEGER NOT NULL DEFAULT 0,
  custom TEXT NOT NULL DEFAULT '{}',
  admin_edited INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT '',
  published_ms INTEGER,
  search_text TEXT NOT NULL DEFAULT ''
)`,
    `CREATE INDEX IF NOT EXISTS ${t.videos}_published_idx ON ${t.videos} (published_ms)`,
    `CREATE INDEX IF NOT EXISTS ${t.videos}_category_idx ON ${t.videos} (category)`,
    `CREATE INDEX IF NOT EXISTS ${t.videos}_stack_idx ON ${t.videos} (stack_key)`,
    `CREATE TABLE IF NOT EXISTS ${t.exclusions} (
  video_id TEXT PRIMARY KEY NOT NULL,
  deleted_by TEXT,
  deleted_at TEXT NOT NULL
)`,
  ];
}

function tableNames(prefix: string) {
  // Interpolated into SQL, so it must be an identifier and nothing else.
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(prefix)) {
    throw new Error(`Invalid D1 table prefix: ${JSON.stringify(prefix)}`);
  }
  return { videos: `${prefix}videos`, exclusions: `${prefix}video_exclusions` };
}

/** camelCase row field → column. Only these are ever written. */
const COLUMNS: Record<keyof LibraryVideo, string> = {
  videoId: 'video_id',
  title: 'title',
  channel: 'channel',
  publishedAt: 'published_at',
  description: 'description',
  viewCount: 'view_count',
  category: 'category',
  tags: 'tags',
  featured: 'featured',
  hidden: 'hidden',
  availability: 'availability',
  stackKey: 'stack_key',
  stackPosition: 'stack_position',
  custom: 'custom',
  adminEdited: 'admin_edited',
  updatedAt: 'updated_at',
  publishedMs: 'published_ms',
  searchText: 'search_text',
};

function toColumnValue(field: keyof LibraryVideo, value: unknown): unknown {
  if (field === 'tags' || field === 'custom') return JSON.stringify(value ?? (field === 'tags' ? [] : {}));
  if (field === 'featured' || field === 'hidden' || field === 'adminEdited') return value ? 1 : 0;
  return value ?? null;
}

function parseJson<T>(text: unknown, fallback: T): T {
  if (typeof text !== 'string' || !text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** A result row back into a {@link LibraryVideo}. */
export function rowToLibraryVideo(row: Record<string, unknown>): LibraryVideo {
  const publishedMs = row.published_ms;
  return {
    videoId: String(row.video_id),
    title: String(row.title ?? ''),
    channel: String(row.channel ?? ''),
    publishedAt: String(row.published_at ?? ''),
    description: String(row.description ?? ''),
    viewCount: Number(row.view_count ?? 0),
    category: (row.category as string | null) ?? null,
    tags: parseJson<string[]>(row.tags, []),
    featured: Boolean(row.featured),
    hidden: Boolean(row.hidden),
    availability: (row.availability as VideoAvailability) ?? 'available',
    stackKey: (row.stack_key as string | null) ?? null,
    stackPosition: Number(row.stack_position ?? 0),
    custom: parseJson<Record<string, string | number | boolean | null>>(row.custom, {}),
    adminEdited: Boolean(row.admin_edited),
    updatedAt: String(row.updated_at ?? ''),
    publishedMs: publishedMs === null || publishedMs === undefined ? null : Number(publishedMs),
    searchText: String(row.search_text ?? ''),
  };
}

const SORT_SQL: Record<string, string> = {
  published: 'published_ms',
  views: 'view_count',
  title: 'lower(title)',
  channel: 'lower(channel)',
  category: 'lower(category)',
  updated: 'updated_at',
};

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

export function createD1LibraryStore(db: D1DatabaseLike, options: D1LibraryStoreOptions = {}): D1LibraryStore {
  const t = tableNames(options.tablePrefix ?? 'eyt_');

  const all = async <T>(sql: string, ...values: unknown[]): Promise<T[]> => {
    const result = await db.prepare(sql).bind(...values).all<T>();
    return result.results ?? [];
  };

  const buildUpdate = (videoId: string, fields: Partial<LibraryVideo>): D1StatementLike | null => {
    const entries = (Object.keys(fields) as (keyof LibraryVideo)[]).filter(
      (field) => field !== 'videoId' && field in COLUMNS && fields[field] !== undefined,
    );
    if (entries.length === 0) return null;
    const assignments = entries.map((field) => `${COLUMNS[field]} = ?`).join(', ');
    return db
      .prepare(`UPDATE ${t.videos} SET ${assignments} WHERE video_id = ?`)
      .bind(...entries.map((field) => toColumnValue(field, fields[field])), videoId);
  };

  const store: D1LibraryStore = {
    async ensureSchema() {
      for (const statement of librarySchemaSql(options.tablePrefix ?? 'eyt_')) {
        await db.prepare(statement).run();
      }
    },

    async list(query: LibraryQuery): Promise<LibraryPage> {
      const limit = clampLimit(query.limit);
      // An empty allow-list matches nothing. Answer without a query rather
      // than binding `json_each('[]')`, which some SQLite builds reject.
      if (query.ids && query.ids.length === 0) {
        return { videos: [], page: 1, limit, pageCount: 1, total: 0 };
      }

      const where: string[] = [];
      const values: unknown[] = [];
      if (!query.includeHidden) where.push('hidden = 0');
      if (query.ids) {
        where.push('video_id IN (SELECT value FROM json_each(?))');
        values.push(JSON.stringify(query.ids));
      }
      if (query.category) {
        where.push('category = ?');
        values.push(query.category);
      }
      if (query.availability && query.availability !== 'any') {
        where.push('availability = ?');
        values.push(query.availability);
      }
      if (query.featured) where.push('featured = 1');
      const search = query.q?.trim().toLowerCase();
      if (search) {
        where.push("(search_text LIKE ? ESCAPE '\\' OR lower(video_id) LIKE ? ESCAPE '\\')");
        values.push(likePattern(search), likePattern(search));
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

      const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM ${t.videos} ${whereSql}`).bind(...values).first<{ n: number }>();
      const total = Number(totalRow?.n ?? 0);
      const pageCount = Math.max(Math.ceil(total / limit), 1);
      const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);

      const column = SORT_SQL[query.sort ?? 'published'] ?? SORT_SQL.published;
      const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
      // NULLs last in both directions, and `video_id` breaks ties so paging
      // stays stable when the sort column repeats — the same order
      // `applyLibraryQuery` defines.
      const rows = await all<Record<string, unknown>>(
        `SELECT * FROM ${t.videos} ${whereSql}
         ORDER BY (${column}) IS NULL, ${column} ${dir}, video_id ${dir}
         LIMIT ? OFFSET ?`,
        ...values,
        limit,
        (page - 1) * limit,
      );
      return { videos: rows.map(rowToLibraryVideo), page, limit, pageCount, total };
    },

    async get(videoId) {
      const row = await db.prepare(`SELECT * FROM ${t.videos} WHERE video_id = ?`).bind(videoId).first<Record<string, unknown>>();
      return row ? rowToLibraryVideo(row) : null;
    },

    async getMany(videoIds) {
      if (videoIds.length === 0) return [];
      const rows = await all<Record<string, unknown>>(
        `SELECT * FROM ${t.videos} WHERE video_id IN (SELECT value FROM json_each(?))`,
        JSON.stringify(videoIds),
      );
      return rows.map(rowToLibraryVideo);
    },

    async all() {
      const rows = await all<Record<string, unknown>>(`SELECT * FROM ${t.videos}`);
      return rows.map(rowToLibraryVideo);
    },

    async getStacks(keys) {
      if (keys.length === 0) return {};
      const rows = await all<Record<string, unknown>>(
        `SELECT * FROM ${t.videos} WHERE stack_key IN (SELECT value FROM json_each(?))
         ORDER BY stack_key, stack_position`,
        JSON.stringify(keys),
      );
      const stacks: Record<string, LibraryVideo[]> = {};
      for (const row of rows.map(rowToLibraryVideo)) {
        (stacks[row.stackKey as string] ??= []).push(row);
      }
      return stacks;
    },

    async categories() {
      const rows = await all<{ category: string }>(
        `SELECT DISTINCT category FROM ${t.videos} WHERE category IS NOT NULL AND category != '' ORDER BY lower(category)`,
      );
      return rows.map((row) => row.category);
    },

    async insert(video) {
      const fields = Object.keys(COLUMNS) as (keyof LibraryVideo)[];
      await db
        .prepare(
          `INSERT INTO ${t.videos} (${fields.map((field) => COLUMNS[field]).join(', ')})
           VALUES (${fields.map(() => '?').join(', ')})`,
        )
        .bind(...fields.map((field) => toColumnValue(field, video[field])))
        .run();
    },

    async update(videoId, fields) {
      const statement = buildUpdate(videoId, fields);
      if (statement) await statement.run();
    },

    async updateMany(updates: readonly LibraryRowUpdate[]) {
      const statements = updates
        .map(({ videoId, fields }) => buildUpdate(videoId, fields))
        .filter((statement): statement is D1StatementLike => statement !== null);
      if (statements.length === 0) return;
      if (db.batch) {
        // D1 caps a batch's size too; 50 statements per round trip stays well inside it.
        for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
        return;
      }
      for (const statement of statements) await statement.run();
    },

    async remove(videoId) {
      const existing = await store.get(videoId);
      if (!existing) return false;
      await db.prepare(`DELETE FROM ${t.videos} WHERE video_id = ?`).bind(videoId).run();
      return true;
    },

    async addExclusion(exclusion: LibraryExclusion) {
      await db
        .prepare(
          `INSERT INTO ${t.exclusions} (video_id, deleted_by, deleted_at) VALUES (?, ?, ?)
           ON CONFLICT(video_id) DO UPDATE SET deleted_by = excluded.deleted_by, deleted_at = excluded.deleted_at`,
        )
        .bind(exclusion.videoId, exclusion.deletedBy, exclusion.deletedAt)
        .run();
    },

    async removeExclusion(videoId) {
      await db.prepare(`DELETE FROM ${t.exclusions} WHERE video_id = ?`).bind(videoId).run();
    },

    async excludedIds(videoIds) {
      if (videoIds.length === 0) return new Set();
      const rows = await all<{ video_id: string }>(
        `SELECT video_id FROM ${t.exclusions} WHERE video_id IN (SELECT value FROM json_each(?))`,
        JSON.stringify(videoIds),
      );
      return new Set(rows.map((row) => row.video_id));
    },

    async listExclusions() {
      const rows = await all<{ video_id: string; deleted_by: string | null; deleted_at: string }>(
        `SELECT video_id, deleted_by, deleted_at FROM ${t.exclusions} ORDER BY deleted_at DESC`,
      );
      return rows.map((row) => ({ videoId: row.video_id, deletedBy: row.deleted_by, deletedAt: row.deleted_at }));
    },
  };

  return store;
}
