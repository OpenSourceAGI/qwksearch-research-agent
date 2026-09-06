/**
 * Drizzle client for the QwkSearch D1 database.
 *
 * Resolution order matches the original qwksearch-web app: the Worker `DB`
 * binding in production, otherwise a local libsql/SQLite file for development
 * and tests (`QWK_DATABASE_URL`, default `file:./data/qwksearch.db`).
 */
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';

import { getCfEnv } from '../cf/env';
import * as schema from './schema';

export type QwkDatabase = ReturnType<typeof drizzleD1<typeof schema>>;

let cached: QwkDatabase | null = null;

export const getQwkDB = (): QwkDatabase => {
  if (cached) return cached;

  const d1 = getCfEnv()?.DB;
  if (!d1) {
    throw new Error(
      'QwkSearch D1 database is not bound. Add a `d1_databases` entry named DB to wrangler.jsonc.',
    );
  }

  cached = drizzleD1(d1, { schema });
  return cached;
};

/** Test hook: swap the cached client (e.g. an in-memory libsql drizzle instance). */
export const __setQwkDBForTests = (db: QwkDatabase | null) => {
  cached = db;
};

export { schema };
