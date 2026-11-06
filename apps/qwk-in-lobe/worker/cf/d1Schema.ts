/**
 * Creates the D1 schema from the Worker itself.
 *
 * The `lobe` Worker is deployed by Workers Builds on push, which never runs
 * `bun run cf:d1:migrate`, so a deployment could serve an empty D1: every
 * request then failed on `no such table: users` and every tRPC call answered
 * UNAUTHORIZED. Every file in `migrations/d1` is idempotent
 * (`CREATE … IF NOT EXISTS`), so the Worker applies the ones it has not
 * recorded yet on the first request of each isolate, and records them in
 * `lobe_schema_migrations`. `bun run cf:d1:migrate` keeps working and is
 * harmless to run as well.
 *
 * Only when LobeHub's data is on D1 (`DATABASE_DRIVER=d1`); the Postgres
 * deployment (`lobe-production`) keeps its manual migration step.
 */
import m0001 from '../../migrations/d1/0001_qwksearch_tables.sql?raw';
import m0002 from '../../migrations/d1/0002_extraction_settings.sql?raw';
import m0003 from '../../migrations/d1/0003_search_settings.sql?raw';
import m0004 from '../../migrations/d1/0004_lobe_users.sql?raw';
import m0005 from '../../migrations/d1/0005_lobehub_tables.sql?raw';
import m0006 from '../../migrations/d1/0006_instance_secrets.sql?raw';
import { getCfEnv } from './env';
import { usesD1ForLobeData } from './keyVaultsSecret';

export interface D1Migration {
  name: string;
  sql: string;
}

/** In order. A new file in `migrations/d1` must be added here too. */
export const D1_MIGRATIONS: D1Migration[] = [
  { name: '0001_qwksearch_tables', sql: m0001 },
  { name: '0002_extraction_settings', sql: m0002 },
  { name: '0003_search_settings', sql: m0003 },
  { name: '0004_lobe_users', sql: m0004 },
  { name: '0005_lobehub_tables', sql: m0005 },
  { name: '0006_instance_secrets', sql: m0006 },
];

/** Statements per `db.batch()` call; 0005 has ~880. */
const BATCH_SIZE = 100;

const CREATE_TRACKING_TABLE = `CREATE TABLE IF NOT EXISTS lobe_schema_migrations (
  name TEXT PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
)`;

/**
 * Splits a migration file into statements: `--` comment lines dropped, split at
 * a `;` that ends a line. The files are generated or hand-written DDL with one
 * statement-ending `;` per line end and no `;` at a line end inside a string.
 */
export const splitStatements = (sql: string): string[] =>
  sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;[\t ]*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

export const applyMigrations = async (
  db: D1Database,
  migrations: D1Migration[] = D1_MIGRATIONS,
): Promise<string[]> => {
  await db.prepare(CREATE_TRACKING_TABLE).run();
  const { results } = await db
    .prepare('SELECT name FROM lobe_schema_migrations')
    .all<{ name: string }>();
  const applied = new Set((results ?? []).map((row) => row.name));

  const ran: string[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;

    const statements = splitStatements(migration.sql);
    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      await db.batch(statements.slice(i, i + BATCH_SIZE).map((sql) => db.prepare(sql)));
    }
    await db
      .prepare('INSERT OR IGNORE INTO lobe_schema_migrations (name) VALUES (?1)')
      .bind(migration.name)
      .run();
    ran.push(migration.name);
  }
  return ran;
};

let pending: Promise<void> | undefined;

/**
 * Makes sure the D1 schema exists before the app runs. After the first request
 * of an isolate this is a resolved promise. A failure is logged and retried on
 * the next request; the request itself goes on and reports its own error.
 */
export const ensureD1Schema = (): Promise<void> => {
  const db = getCfEnv()?.DB;
  if (!db) return Promise.resolve();
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  if (!usesD1ForLobeData(env, true)) return Promise.resolve();

  pending ??= applyMigrations(db)
    .then((ran) => {
      if (ran.length > 0) console.info(`[d1-schema] applied ${ran.join(', ')}`);
    })
    .catch((error) => {
      pending = undefined;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[d1-schema] could not create the D1 tables: ${message}. Apply them with \`bun run cf:d1:migrate\`.`,
      );
    });
  return pending;
};

/** Test hook. */
export const __resetD1Schema = () => {
  pending = undefined;
};
