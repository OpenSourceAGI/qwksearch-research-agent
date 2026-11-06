/**
 * Postgres → SQLite (Cloudflare D1) SQL translation for the LobeHub models.
 *
 * Drizzle's Postgres dialect builds every query the models run. D1 speaks
 * SQLite, so each statement is rewritten on its way out: `$1` placeholders,
 * `::type` casts, Postgres-only functions and operators. Only code regions are
 * touched; string literals and quoted identifiers pass through as they are
 * (identifiers can be renamed, see `TABLE_RENAMES`).
 *
 * This covers what the chat path needs (users, settings, agents, sessions,
 * topics, messages, providers). Postgres-only features such as pgvector
 * similarity, full-text search, `DISTINCT ON` and `LATERAL` joins are not
 * translated and fail on D1 the way any unknown SQL does.
 */

import { rewritePgExpressions } from './expressions';

/**
 * LobeHub tables whose names are already taken by QwkSearch tables in the same
 * D1 database. They get a `lobe_` prefix on D1 only.
 */
export const TABLE_RENAMES: Record<string, string> = {
  documents: 'lobe_documents',
};

/** ISO-8601 UTC timestamp, the format the timestamp columns are stored in. */
export const SQLITE_NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

/** Random v4-shaped UUID, for `gen_random_uuid()` in raw SQL. */
export const SQLITE_UUID = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))))`;

const FUNCTION_RENAMES: Record<string, string> = {
  array_agg: 'json_group_array',
  array_length: 'json_array_length',
  array_to_json: 'json',
  greatest: 'max',
  json_agg: 'json_group_array',
  json_build_array: 'json_array',
  json_build_object: 'json_object',
  jsonb_agg: 'json_group_array',
  jsonb_array_length: 'json_array_length',
  jsonb_build_array: 'json_array',
  jsonb_build_object: 'json_object',
  jsonb_extract_path_text: 'json_extract',
  jsonb_typeof: 'json_type',
  least: 'min',
  string_agg: 'group_concat',
  to_json: 'json',
  to_jsonb: 'json',
};

// Longest first so `timestamp with time zone` wins over `timestamp`.
const CAST_TYPES = [
  'timestamp with time zone',
  'timestamp without time zone',
  'time with time zone',
  'double precision',
  'character varying',
  'timestamptz',
  'timestamp',
  'varchar',
  'integer',
  'numeric',
  'decimal',
  'boolean',
  'regclass',
  'bigint',
  'float8',
  'float4',
  'vector',
  'jsonb',
  'json',
  'text',
  'uuid',
  'date',
  'int8',
  'int4',
  'int2',
  'bool',
  'real',
  'int',
];

const isIdentStart = (c: string) => /[A-Z_]/i.test(c);
const isIdentChar = (c: string) => /\w/.test(c);

/** Skip a `::type` cast starting at `i` (which points at the first `:`). Returns the new index. */
const skipCast = (src: string, i: number): number => {
  let j = i + 2;
  while (src[j] === ' ') j++;
  const rest = src.slice(j).toLowerCase();
  const type = CAST_TYPES.find((t) => rest.startsWith(t) && !isIdentChar(rest[t.length] ?? ''));
  if (type) {
    j += type.length;
  } else if (src[j] === '"') {
    j = src.indexOf('"', j + 1) + 1;
  } else {
    while (j < src.length && isIdentChar(src[j])) j++;
  }
  // `varchar(255)`, `vector(1024)`
  if (src[j] === '(') j = src.indexOf(')', j) + 1;
  // `text[]`
  while (src.slice(j, j + 2) === '[]') j += 2;
  return j;
};

/**
 * Rewrite one Postgres statement for SQLite. `= any($n)` array comparisons
 * become `in (select value from json_each(?n))`; array params are bound as
 * JSON text by `toD1Value`.
 */
export const translateSQL = (input: string): string => {
  let out = '';
  let i = 0;
  const src = rewritePgExpressions(input);
  // Where the last string literal or placeholder starts in `out`, for `::jsonb`.
  let atomStart = -1;
  let atomEnd = -1;

  while (i < src.length) {
    const c = src[i];

    // String literal (with '' escapes). Postgres E'' strings are rare in drizzle output.
    if (c === "'") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "'" && src[j + 1] === "'") j += 2;
        else if (src[j] === "'") break;
        else j++;
      }
      atomStart = out.length;
      out += src.slice(i, j + 1);
      atomEnd = out.length;
      i = j + 1;
      continue;
    }

    // Quoted identifier
    if (c === '"') {
      const j = src.indexOf('"', i + 1);
      const name = src.slice(i + 1, j);
      out += `"${TABLE_RENAMES[name] ?? name}"`;
      i = j + 1;
      continue;
    }

    // Cast
    if (c === ':' && src[i + 1] === ':') {
      const end = skipCast(src, i);
      // `$1::jsonb` / `'{}'::jsonb`: SQLite would treat the text as a plain
      // string inside json_object()/json_set(); json() keeps it JSON.
      if (atomEnd === out.length && /^::\s*jsonb?$/i.test(src.slice(i, end).trim())) {
        out = `${out.slice(0, atomStart)}json(${out.slice(atomStart)})`;
        atomEnd = -1;
      }
      i = end;
      continue;
    }

    // Placeholder $1 → ?1
    if (c === '$' && /\d/.test(src[i + 1] ?? '')) {
      let j = i + 1;
      while (/\d/.test(src[j] ?? '')) j++;
      atomStart = out.length;
      out += `?${src.slice(i + 1, j)}`;
      atomEnd = out.length;
      i = j;
      continue;
    }

    if (isIdentStart(c) && !isIdentChar(src[i - 1] ?? '')) {
      let j = i;
      while (j < src.length && isIdentChar(src[j])) j++;
      const word = src.slice(i, j);
      const lower = word.toLowerCase();
      const next = src.slice(j).match(/^\s*\(/);

      if (lower === 'ilike') {
        out += 'like';
        i = j;
        continue;
      }

      if (next) {
        const close = src.slice(j).match(/^\s*\(\s*\)/);
        if ((lower === 'now' || lower === 'clock_timestamp') && close) {
          out += SQLITE_NOW;
          i = j + close[0].length;
          continue;
        }
        if (lower === 'gen_random_uuid' && close) {
          out += SQLITE_UUID;
          i = j + close[0].length;
          continue;
        }
        if (lower in FUNCTION_RENAMES) {
          out += FUNCTION_RENAMES[lower];
          i = j;
          continue;
        }
        // `= any(?3)` → `in (select value from json_each(?3))`
        if (lower === 'any') {
          const m = src.slice(j).match(/^\s*\(\s*\$(\d+)\s*(?:::\s*\w+(?:\[\])?\s*)?\)/);
          if (m && /=\s*$/.test(out)) {
            out = out.replace(/=\s*$/, 'in ');
            out += `(select value from json_each(?${m[1]}))`;
            i = j + m[0].length;
            continue;
          }
        }
      }

      if (lower === 'current_timestamp') {
        out += SQLITE_NOW;
        i = j;
        continue;
      }

      // `for update` / `for no key update` / `for share` row locks: SQLite has none.
      if (lower === 'for') {
        const m = src
          .slice(j)
          .match(/^\s+(no\s+key\s+update|update|share|key\s+share)(\s+(skip\s+locked|nowait))?/i);
        if (m) {
          i = j + m[0].length;
          continue;
        }
      }

      out += word;
      i = j;
      continue;
    }

    out += c;
    i++;
  }

  return out;
};

/** A transaction-control statement (D1 runs every statement on its own). */
export const isTransactionControl = (query: string) =>
  /^\s*(?:begin|start transaction|commit|rollback|savepoint|release savepoint|set\s+(?:local\s+)?transaction)\b/i.test(
    query,
  );

export type D1Value = string | number | null | ArrayBuffer;

/** Coerce a driver param into something D1 can bind. */
export const toD1Value = (value: unknown): D1Value => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  return JSON.stringify(value);
};

const toSQLLiteral = (value: D1Value): string => {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  return `X'${[...new Uint8Array(value)].map((b) => b.toString(16).padStart(2, '0')).join('')}'`;
};

/** D1 binds at most 100 parameters per statement. */
export const D1_MAX_PARAMS = 100;

/**
 * Inline `?n` parameters as SQL literals. Used when a statement has more
 * parameters than D1 can bind (bulk inserts, long `in (...)` lists).
 */
export const inlineParams = (query: string, params: D1Value[]): string => {
  let out = '';
  let i = 0;
  while (i < query.length) {
    const c = query[i];
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < query.length) {
        if (query[j] === c && query[j + 1] === c) j += 2;
        else if (query[j] === c) break;
        else j++;
      }
      out += query.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '?') {
      let j = i + 1;
      while (/\d/.test(query[j] ?? '')) j++;
      const index = Number(query.slice(i + 1, j)) - 1;
      out += toSQLLiteral(params[index] ?? null);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
};
