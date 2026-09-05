import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as nodeDrizzle } from 'drizzle-orm/node-postgres';
import { Pool as NodePool } from 'pg';
import ws from 'ws';

import { serverDBEnv } from '@/config/db';

import * as schema from '../schemas';
import type { LobeChatDatabase } from '../type';
import { getCfEnv } from './cloudflare';

/**
 * Cloudflare Hyperdrive exposes a pooled Postgres endpoint to the Worker through
 * a binding; `pg` (node-postgres) talks to it under `nodejs_compat`. When the
 * binding is present it takes precedence over `DATABASE_URL`, so the same
 * LobeHub database code runs on Workers without a Neon-specific URL.
 */
export const resolveHyperdriveConnectionString = (): string | undefined => {
  const hyperdrive = getCfEnv()?.HYPERDRIVE;
  if (!hyperdrive) return undefined;

  return hyperdrive.connectionString;
};

export const getDBInstance = (): LobeChatDatabase => {
  // In test environment, return a mock instance to avoid initialization errors
  if (process.env.NODE_ENV === 'test') return {} as LobeChatDatabase;

  if (!serverDBEnv.KEY_VAULTS_SECRET) {
    throw new Error(
      ` \`KEY_VAULTS_SECRET\` is not set, please set it in your environment variables.

If you don't have it, please run \`openssl rand -base64 32\` to create one.
`,
    );
  }

  const hyperdriveConnectionString = resolveHyperdriveConnectionString();
  const connectionString = hyperdriveConnectionString || serverDBEnv.DATABASE_URL;

  if (!connectionString) {
    throw new Error(`You are try to use database, but "DATABASE_URL" is not set correctly`);
  }

  // When DATABASE_STATEMENT_TIMEOUT is set, Postgres aborts any statement (and any
  // transaction left idle) exceeding it on the server side, so a stuck query can't
  // block indefinitely. Omit the keys entirely when unset to keep Postgres' defaults.
  const statementTimeout = serverDBEnv.DATABASE_STATEMENT_TIMEOUT;
  const timeoutConfig = statementTimeout
    ? {
        idle_in_transaction_session_timeout: statementTimeout,
        statement_timeout: statementTimeout,
      }
    : {};

  // Hyperdrive already pools and keeps connections warm; the Worker only needs a
  // small, short-lived pg pool per isolate. `pg` is the driver Cloudflare
  // documents for Hyperdrive, so force it whenever the binding is bound.
  if (hyperdriveConnectionString || serverDBEnv.DATABASE_DRIVER === 'node') {
    const client = new NodePool({ connectionString, ...timeoutConfig });
    // pg.Pool emits 'error' on idle clients when the backend connection drops.
    // Without a listener Node escalates it to uncaughtException and exits the process.
    // See: https://node-postgres.com/apis/pool#error
    client.on('error', (err) => {
      console.error('[NodePool] idle client error (swallowed to prevent process crash):', {
        code: (err as NodeJS.ErrnoException).code,
        message: err.message,
        stack: err.stack,
      });
    });
    return nodeDrizzle(client, { schema });
  }

  if (process.env.MIGRATION_DB === '1') {
    // https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined
    neonConfig.webSocketConstructor = ws;
  }

  const client = new NeonPool({ connectionString, ...timeoutConfig });
  // NeonPool runs over WebSocket; transient drops surface as 'error' on the pool.
  // Without a listener Node escalates it to uncaughtException — on Vercel this killed
  // the entire Lambda 1800+ times in 5 minutes (see ).
  client.on('error', (err: Error) => {
    console.error('[NeonPool] idle client error (swallowed to prevent process crash):', {
      code: (err as NodeJS.ErrnoException).code,
      message: err.message,
      stack: err.stack,
    });
  });
  return neonDrizzle(client, { schema });
};
