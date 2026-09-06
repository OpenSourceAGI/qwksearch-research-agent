/**
 * Typed access to the Cloudflare Worker bindings.
 *
 * Works outside of Workers too (Node dev server, vitest): `getCfEnv()` simply
 * returns `undefined` there, so callers can branch on the presence of a
 * binding and fall back to the classic LobeHub behaviour.
 */

export interface CloudflareEmailMessage {
  from: string;
  html?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  to: string | string[];
}

export interface CloudflareEmailSender {
  send: (message: CloudflareEmailMessage) => Promise<{ id?: string } | void>;
}

export interface LobeWorkerEnv {
  [key: string]: unknown;
  /** Static assets (built SPA + public/) */
  ASSETS?: Fetcher;
  /** QwkSearch D1 database: article cache, favorites, documents, quotes. */
  DB?: D1Database;
  /** Cloudflare Email Routing sender used for auth emails. */
  EMAIL?: CloudflareEmailSender;
  /** Postgres connection pool for the LobeHub database. */
  HYPERDRIVE?: Hyperdrive;
  /** Better Auth secondary storage + small caches. */
  KV?: KVNamespace;
  /** Uploads bucket (S3-compatible access is configured via the S3_* env vars). */
  R2?: R2Bucket;
}

const ENV_SLOT = '__LOBE_CF_ENV__';

type GlobalWithEnv = typeof globalThis & { [ENV_SLOT]?: LobeWorkerEnv };

export const setCfEnv = (env: LobeWorkerEnv) => {
  (globalThis as GlobalWithEnv)[ENV_SLOT] = env;
};

export const getCfEnv = (): LobeWorkerEnv | undefined => (globalThis as GlobalWithEnv)[ENV_SLOT];

export const hasCfBinding = <K extends keyof LobeWorkerEnv>(key: K): boolean =>
  !!getCfEnv()?.[key];

export const isCloudflareWorker = () =>
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
