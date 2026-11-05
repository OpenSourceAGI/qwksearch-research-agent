/**
 * A key-vault secret for the D1 Worker when the operator has not set one.
 *
 * LobeHub refuses to open its database without `KEY_VAULTS_SECRET` (it encrypts
 * provider API keys with it), so on a `lobe` Worker deployed with only the D1
 * binding every tRPC call answered UNAUTHORIZED and the chat never loaded. On
 * D1 the Worker now generates one random 256-bit secret, keeps it in D1
 * (`lobe_instance_secrets`, migration 0006) and publishes it on `process.env`
 * before LobeHub's modules read their config.
 *
 * - An explicit `KEY_VAULTS_SECRET` (Worker secret) always wins and nothing is
 *   written. Switching to one later makes keys saved under the generated
 *   secret unreadable: visitors re-enter their provider key.
 * - Every isolate converges on the same value: `INSERT OR IGNORE` keeps the
 *   first writer's secret and everyone reads it back.
 * - The secret sits in the same database as the data it encrypts, so it does
 *   not protect keys from someone who can read D1; set the Worker secret for
 *   that. It does keep them out of plain-text dumps of single tables.
 */
import { getCfEnv } from './env';

export const KEY_VAULTS_SECRET_NAME = 'KEY_VAULTS_SECRET';

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS lobe_instance_secrets (
  name TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`;

type ProcessEnv = Record<string, string | undefined>;

const processEnv = (): ProcessEnv | undefined =>
  (globalThis as { process?: { env?: ProcessEnv } }).process?.env;

/** Whether LobeHub's tables live in D1 on this Worker (see `core/web-server.ts`). */
export const usesD1ForLobeData = (env: ProcessEnv | undefined, hasD1: boolean): boolean => {
  if (!hasD1) return false;
  if (env?.DATABASE_DRIVER === 'd1') return true;
  // Same fallback as getDBInstance: a D1 binding and no Postgres at all.
  return !env?.DATABASE_DRIVER && !env?.DATABASE_URL && !getCfEnv()?.HYPERDRIVE;
};

export const generateSecret = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const loadOrCreateSecret = async (db: D1Database, name: string): Promise<string> => {
  await db.prepare(CREATE_TABLE).run();
  await db
    .prepare('INSERT OR IGNORE INTO lobe_instance_secrets (name, value) VALUES (?1, ?2)')
    .bind(name, generateSecret())
    .run();
  const row = await db
    .prepare('SELECT value FROM lobe_instance_secrets WHERE name = ?1')
    .bind(name)
    .first<{ value: string }>();
  if (!row?.value) throw new Error(`lobe_instance_secrets has no ${name} row after insert`);
  return row.value;
};

let pending: Promise<void> | undefined;

/**
 * Makes sure `process.env.KEY_VAULTS_SECRET` is set before the app runs. Only
 * the first request of an isolate touches D1; a failure is logged and retried
 * on the next request instead of failing this one (the database layer then
 * reports the missing secret itself).
 */
export const ensureKeyVaultsSecret = (): Promise<void> => {
  const env = processEnv();
  if (!env || env[KEY_VAULTS_SECRET_NAME]) return Promise.resolve();

  const db = getCfEnv()?.DB;
  if (!db || !usesD1ForLobeData(env, true)) return Promise.resolve();

  pending ??= loadOrCreateSecret(db, KEY_VAULTS_SECRET_NAME)
    .then((secret) => {
      env[KEY_VAULTS_SECRET_NAME] = secret;
    })
    .catch((error) => {
      pending = undefined;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[key-vaults] could not load the generated KEY_VAULTS_SECRET from D1: ${message}. ` +
          'Set KEY_VAULTS_SECRET as a Worker secret (openssl rand -base64 32) or apply migrations/d1/0006_instance_secrets.sql.',
      );
    });
  return pending;
};

/** Test hook. */
export const __resetKeyVaultsSecret = () => {
  pending = undefined;
};
