/**
 * LobeHub's database on Cloudflare D1.
 *
 * The models are written against drizzle's Postgres dialect. This driver keeps
 * that dialect (so every model, type and query builder stays as it is) and
 * sends the generated SQL to D1 through drizzle's `pg-proxy`, translated to
 * SQLite on the way (see `translate.ts`). The tables come from
 * `migrations/d1/0005_lobehub_tables.sql`, generated from the same schema by
 * `scripts/generateD1LobeSchema.mts`.
 *
 * D1 has no interactive transactions, so `db.transaction(fn)` runs `fn`
 * against the same connection without BEGIN/COMMIT: statements apply one by
 * one and are not rolled back if a later one fails.
 */
import { drizzle as proxyDrizzle } from 'drizzle-orm/pg-proxy';
import { PgProxyTransaction } from 'drizzle-orm/pg-proxy/session';

import * as schema from '../../schemas';
import type { LobeChatDatabase } from '../../type';
import { prepareSchemaForD1 } from './columns';
import { markD1Database } from './marker';
import {
  D1_MAX_PARAMS,
  type D1Value,
  inlineParams,
  isTransactionControl,
  toD1Value,
  translateSQL,
} from './translate';

/** The subset of the `D1Database` binding this driver uses. */
export interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
}

interface D1PreparedStatementLike {
  all: <T = Record<string, unknown>>() => Promise<{ meta?: { changes?: number }; results?: T[] }>;
  bind: (...values: D1Value[]) => D1PreparedStatementLike;
  raw: <T = unknown[]>() => Promise<T[]>;
  run: () => Promise<unknown>;
}

const translated = new Map<string, string>();

const translateCached = (query: string) => {
  let result = translated.get(query);
  if (result === undefined) {
    result = translateSQL(query);
    if (translated.size > 2000) translated.clear();
    translated.set(query, result);
  }
  return result;
};

/** Run a pg-proxy request against D1. */
export const runOnD1 = async (
  d1: D1DatabaseLike,
  query: string,
  rawParams: unknown[],
  method: 'all' | 'execute',
): Promise<{ rows: any }> => {
  if (isTransactionControl(query)) return { rows: method === 'all' ? [] : withRows([], 0) };

  let sqlText = translateCached(query);
  let params = rawParams.map(toD1Value);
  if (params.length > D1_MAX_PARAMS) {
    sqlText = inlineParams(sqlText, params);
    params = [];
  }

  let statement = d1.prepare(sqlText);
  if (params.length > 0) statement = statement.bind(...params);

  try {
    if (method === 'all') return { rows: await statement.raw() };

    const result = await statement.all();
    const rows = (result.results ?? []).map(parseJsonValues);
    return { rows: withRows(rows, result.meta?.changes ?? rows.length) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(`D1 query failed: ${message}\nSQL: ${sqlText}`);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
};

/**
 * Raw `db.execute()` results: Postgres hands back jsonb values parsed, SQLite
 * as text. Parse values that are JSON objects or arrays so callers reading
 * `row.usage.tools` keep working.
 */
const parseJsonValues = (row: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== 'string' || !/^[[{]/.test(value)) continue;
    try {
      row[key] = JSON.parse(value);
    } catch {
      /* plain text that happens to start with a bracket */
    }
  }
  return row;
};

/**
 * `db.execute()` callers read either the rows array (pg-proxy) or a
 * node-postgres style `{ rows, rowCount }` result. Return an array that is both.
 */
const withRows = <T>(rows: T[], rowCount: number) => Object.assign([...rows], { rowCount, rows });

export const createD1Database = (d1: D1DatabaseLike): LobeChatDatabase => {
  prepareSchemaForD1(schema as Record<string, unknown>);

  const db = proxyDrizzle((query, params, method) => runOnD1(d1, query, params, method), {
    schema,
  });

  // pg-proxy refuses transactions. Run the callback on a transaction object
  // that shares the session, with no BEGIN/COMMIT (see the note above).
  const session = (db as unknown as { session: any }).session;
  const runInline = async (fn: (tx: any) => Promise<unknown>) => {
    const tx = markD1Database(
      new PgProxyTransaction(session.dialect, session, session.schema) as unknown as {
        transaction: typeof runInline;
      },
    );
    tx.transaction = runInline;
    return fn(tx);
  };
  session.transaction = runInline;

  return markD1Database(db) as unknown as LobeChatDatabase;
};
