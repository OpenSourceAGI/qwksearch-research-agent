import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle as nodeDrizzle } from 'drizzle-orm/node-postgres';
import { migrate as nodeMigrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { Pool as NodePool } from 'pg';

import { serverDBEnv } from '@/config/db';

import * as schema from '../schemas';
import type { LobeChatDatabase } from '../type';
import type { D1DatabaseLike } from './d1';

const migrationsFolder = join(__dirname, '../../migrations');

const isServerDBMode = process.env.TEST_SERVER_DB === '1';
const isD1Mode = process.env.TEST_DB_DRIVER === 'd1';

let testD1DB: LobeChatDatabase | null = null;

/**
 * D1 mode (`TEST_DB_DRIVER=d1`): a local D1 from wrangler's platform proxy with
 * every `migrations/d1` file applied, behind the D1 driver the Worker uses.
 */
const getTestD1DB = async (): Promise<LobeChatDatabase> => {
  if (testD1DB) return testD1DB;

  const { mkdtempSync, readdirSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { getPlatformProxy } = await import('wrangler');
  const { createD1Database } = await import('./d1');

  const appRoot = join(__dirname, '../../../..');
  const { env } = await getPlatformProxy<{ DB: D1DatabaseLike }>({
    configPath: join(appRoot, 'wrangler.local.jsonc'),
    persist: { path: mkdtempSync(join(tmpdir(), 'lobe-d1-test-')) },
  });

  const d1Dir = join(appRoot, 'migrations/d1');
  for (const file of readdirSync(d1Dir).sort()) {
    const statements = readFileSync(join(d1Dir, file), 'utf8')
      .replaceAll(/--.*$/gm, '')
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) await env.DB.prepare(statement).run();
  }

  testD1DB = createD1Database(env.DB);
  return testD1DB;
};

let testClientDB: ReturnType<typeof pgliteDrizzle<typeof schema>> | null = null;
let testServerDB: ReturnType<typeof nodeDrizzle<typeof schema>> | null = null;

export const getTestDB = async (): Promise<LobeChatDatabase> => {
  if (isD1Mode) return getTestD1DB();

  // Server DB mode (node-postgres)
  if (isServerDBMode) {
    if (testServerDB) return testServerDB as unknown as LobeChatDatabase;

    const connectionString = serverDBEnv.DATABASE_TEST_URL;

    if (!connectionString) {
      throw new Error('DATABASE_TEST_URL is not set');
    }

    const client = new NodePool({ connectionString });
    testServerDB = nodeDrizzle(client, { schema });

    await nodeMigrate(testServerDB, { migrationsFolder });

    return testServerDB as unknown as LobeChatDatabase;
  }

  // Client DB mode (PGlite)
  if (testClientDB) return testClientDB as unknown as LobeChatDatabase;

  const pglite = new PGlite({ extensions: { vector } });
  testClientDB = pgliteDrizzle({ client: pglite, schema });

  // Custom migration that skips pg_search-related SQL for PGlite compatibility
  const migrations = readMigrationFiles({ migrationsFolder });

  await testClientDB.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await testClientDB.execute(sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  for (const migration of migrations) {
    const skipSql = migration.sql.some(
      (s) => s.toLowerCase().includes('pg_search') || s.toLowerCase().includes('bm25'),
    );

    if (!skipSql) {
      for (const stmt of migration.sql) {
        await testClientDB.execute(sql.raw(stmt));
      }
    }

    await testClientDB.execute(
      sql`INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES (${migration.hash}, ${migration.folderMillis})`,
    );
  }

  return testClientDB as unknown as LobeChatDatabase;
};
