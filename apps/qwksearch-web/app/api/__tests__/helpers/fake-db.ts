/**
 * @fileoverview Test double for the Drizzle handle returned by `getDB()`.
 *
 * Route handlers build queries as fluent chains
 * (`db.select().from(t).where(x).orderBy(y)`, `db.insert(t).values(v).returning()`)
 * and await the final link. `createFakeDb` returns an object whose chain links
 * are all thenable, so any chain resolves to the configured result while every
 * call is recorded for assertions.
 */

export interface FakeDbOptions {
  /** Rows returned by an awaited `db.select()...` chain. */
  select?: unknown[];
  /** Rows returned by an awaited `db.insert()...returning()` chain. */
  insert?: unknown[];
  /** Rows returned by an awaited `db.update()...returning()` chain. */
  update?: unknown[];
  /** Value an awaited `db.delete()...` chain resolves to. */
  delete?: unknown;
  /** Results for the relational `db.query.<table>.findMany/findFirst` API. */
  query?: Record<string, { findMany?: unknown; findFirst?: unknown }>;
}

/** Every fluent method a route handler in this app chains onto a query. */
const CHAIN_METHODS = [
  'from',
  'where',
  'set',
  'values',
  'orderBy',
  'limit',
  'offset',
  'returning',
  'groupBy',
  'innerJoin',
  'leftJoin',
  'onConflictDoNothing',
  'onConflictDoUpdate',
] as const;

export interface FakeDb {
  select: (...args: unknown[]) => any;
  insert: (...args: unknown[]) => any;
  update: (...args: unknown[]) => any;
  delete: (...args: unknown[]) => any;
  query: Record<string, { findMany: (...args: unknown[]) => any; findFirst: (...args: unknown[]) => any }>;
  /** Recorded calls, keyed by method name, in call order. */
  calls: Record<string, unknown[][]>;
}

export function createFakeDb(options: FakeDbOptions = {}): FakeDb {
  const calls: Record<string, unknown[][]> = {};

  const record = (method: string, args: unknown[]) => {
    (calls[method] ??= []).push(args);
  };

  const makeChain = (resolveWith: () => unknown) => {
    const node: Record<string, unknown> = {};
    for (const method of CHAIN_METHODS) {
      node[method] = (...args: unknown[]) => {
        record(method, args);
        return node;
      };
    }
    node.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resolveWith()).then(onFulfilled, onRejected);
    return node;
  };

  const entrypoint = (name: string, resolveWith: () => unknown) => (...args: unknown[]) => {
    record(name, args);
    return makeChain(resolveWith);
  };

  const query = new Proxy(
    {},
    {
      get(_target, table: string) {
        return {
          findMany: (...args: unknown[]) => {
            record(`query.${table}.findMany`, args);
            return Promise.resolve(options.query?.[table]?.findMany ?? []);
          },
          findFirst: (...args: unknown[]) => {
            record(`query.${table}.findFirst`, args);
            return Promise.resolve(options.query?.[table]?.findFirst ?? undefined);
          },
        };
      },
    },
  ) as FakeDb['query'];

  return {
    select: entrypoint('select', () => options.select ?? []),
    insert: entrypoint('insert', () => options.insert ?? []),
    update: entrypoint('update', () => options.update ?? []),
    delete: entrypoint('delete', () => options.delete ?? undefined),
    query,
    calls,
  };
}

/** Builds the `{ params }` context Next.js passes to a dynamic route handler. */
export function routeContext<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

/** Builds a JSON request for a route handler under test. */
export function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;
}
