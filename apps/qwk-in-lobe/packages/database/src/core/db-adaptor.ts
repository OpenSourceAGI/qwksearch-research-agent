import type { LobeChatDatabase } from '../type';
import { getDBInstance } from './web-server';

/**
 * Lazy-load database instance
 * Avoid initializing the database every time the module is imported
 */
let cachedDB: LobeChatDatabase | null = null;

const resolveDB = (): LobeChatDatabase => {
  // If there's already a cached instance, return it directly
  if (cachedDB) return cachedDB;

  try {
    // Select the appropriate database instance based on the environment
    cachedDB = getDBInstance();
    return cachedDB;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

export const getServerDB = async (): Promise<LobeChatDatabase> => resolveDB();

/**
 * `serverDB` is a lazy handle, not a connection.
 *
 * It used to be `getDBInstance()` evaluated at module scope, so *importing* any
 * module that touches the database built a connection pool — and threw when
 * `KEY_VAULTS_SECRET` / `DATABASE_URL` were absent. `next build` imports every
 * route to collect its page data, so a build without runtime secrets died on
 * the first route that imports this (see `/api/auth/resolve-username`), even
 * though no query runs during a build.
 *
 * The proxy defers construction to the first property access and shares the one
 * cached instance with `getServerDB()`, so call sites keep using `serverDB`
 * exactly as before while a build only needs the secrets it actually reads.
 */
export const serverDB = new Proxy({} as LobeChatDatabase, {
  get: (_target, property) => {
    const db = resolveDB();
    const value = Reflect.get(db, property);

    // Methods must keep the real instance as `this`; drizzle reaches for its own
    // internals (session, dialect, schema) from there.
    return typeof value === 'function' ? value.bind(db) : value;
  },
  getOwnPropertyDescriptor: (_target, property) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(resolveDB(), property);

    // The proxy target is an empty object, so reporting a non-configurable
    // property of another object would violate the proxy invariants.
    return descriptor && { ...descriptor, configurable: true };
  },
  getPrototypeOf: () => Reflect.getPrototypeOf(resolveDB()),
  has: (_target, property) => Reflect.has(resolveDB(), property),
  ownKeys: () => Reflect.ownKeys(resolveDB()),
  set: (_target, property, value) => Reflect.set(resolveDB(), property, value),
});
