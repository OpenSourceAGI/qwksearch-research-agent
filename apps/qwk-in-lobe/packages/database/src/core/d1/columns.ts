/**
 * Column-level adjustments that let the Postgres schema objects run on SQLite.
 *
 * - Drizzle's Postgres dialect writes `default` into `insert ... values (...)`
 *   for every column the caller left out. SQLite has no `DEFAULT` keyword in a
 *   values list, so every column gets a client-side default (`defaultFn`) that
 *   produces the same value Postgres would: `now()` → `new Date()`,
 *   `gen_random_uuid()` → `crypto.randomUUID()`, literals as they are, and
 *   `null` for columns with no default (an `INTEGER PRIMARY KEY` fills itself
 *   from a null, which covers `serial`).
 * - SQLite returns booleans as 0/1 and has no array type: booleans are decoded
 *   back, and Postgres arrays are stored as JSON text.
 */
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { getTableConfig, PgArray, PgBoolean } from 'drizzle-orm/pg-core';

const isTable = (value: unknown): value is PgTable =>
  !!value && typeof value === 'object' && Symbol.for('drizzle:IsDrizzleTable') in value;

export const getSchemaTables = (schema: Record<string, unknown>): PgTable[] =>
  Object.values(schema).filter(isTable);

const sqlText = (value: unknown): string | undefined => {
  const chunks = (value as { queryChunks?: unknown[] } | undefined)?.queryChunks;
  if (!chunks) return undefined;
  return chunks
    .map((chunk) => {
      const v = (chunk as { value?: unknown }).value;
      if (Array.isArray(v)) return v.join('');
      return typeof v === 'string' ? v : '';
    })
    .join('');
};

/** The client-side equivalent of a column's database default. */
export const clientDefault = (column: PgColumn): (() => unknown) | undefined => {
  const def = column.default;
  if (!column.hasDefault || def === undefined) return () => null;

  const text = sqlText(def);
  if (text !== undefined) {
    const lower = text.trim().toLowerCase();
    if (lower === 'now()' || lower === 'current_timestamp') {
      // Some timestamp columns use `mode: 'string'`; give them the string form.
      return (column as unknown as { mode?: string }).mode === 'string'
        ? () => new Date().toISOString()
        : () => new Date();
    }
    if (lower === 'gen_random_uuid()') return () => crypto.randomUUID();
    // Sequence-backed defaults (`nextval(...)`): an increasing number is enough.
    if (lower.startsWith('nextval('))
      return () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
    // `'{}'::jsonb`, `'[]'::jsonb`, `'{}'::text[]`
    const literal = lower.match(/^'(.*)'(::.*)?$/s);
    if (literal) {
      const raw = text
        .trim()
        .match(/^'(.*)'(::.*)?$/s)![1]
        .replaceAll("''", "'");
      if (/::\s*\w+\[\]/.test(lower) && raw.startsWith('{')) {
        return () => (raw === '{}' ? [] : raw.slice(1, -1).split(','));
      }
      try {
        const parsed = JSON.parse(raw);
        return () => structuredClone(parsed);
      } catch {
        return () => raw;
      }
    }
    if (lower === 'true' || lower === 'false') return () => lower === 'true';
    if (/^-?\d+(?:\.\d+)?$/.test(lower)) return () => Number(lower);
    // Unknown SQL default: leave it to the column default in the D1 schema.
    return undefined;
  }

  if (def !== null && typeof def === 'object') return () => structuredClone(def);
  return () => def;
};

let decodersPatched = false;

const patchDecoders = () => {
  if (decodersPatched) return;
  decodersPatched = true;

  const boolProto = PgBoolean.prototype as unknown as {
    mapFromDriverValue?: (value: unknown) => unknown;
  };
  boolProto.mapFromDriverValue = (value: unknown) =>
    typeof value === 'number' ? value !== 0 : value;

  const arrayProto = PgArray.prototype as unknown as {
    mapFromDriverValue: (value: unknown) => unknown;
    mapToDriverValue: (value: unknown[], isNestedArray?: boolean) => unknown;
  };
  const fromDriver = arrayProto.mapFromDriverValue;
  arrayProto.mapFromDriverValue = function (this: unknown, value: unknown) {
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        value = JSON.parse(value);
      } catch {
        /* fall through to the Postgres array parser */
      }
    }
    return fromDriver.call(this, value);
  };
  arrayProto.mapToDriverValue = function (this: unknown, value: unknown[]) {
    return JSON.stringify(value);
  };
};

const patchedTables = new WeakSet<object>();

/** Prepare a schema's columns for D1. Idempotent. */
export const prepareSchemaForD1 = (schema: Record<string, unknown>) => {
  patchDecoders();

  for (const table of getSchemaTables(schema)) {
    if (patchedTables.has(table)) continue;
    patchedTables.add(table);

    for (const column of getTableConfig(table).columns) {
      const mutable = column as unknown as { defaultFn?: () => unknown };
      if (mutable.defaultFn) continue;
      // Generated columns are never written.
      if ((column as unknown as { generated?: unknown }).generated) continue;
      const fn = clientDefault(column);
      if (fn) mutable.defaultFn = fn;
    }
  }
};
