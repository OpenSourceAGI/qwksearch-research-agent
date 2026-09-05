/**
 * Bridge to the Cloudflare Worker bindings for the database layer.
 *
 * Kept as a tiny relative re-export so the database package never depends on
 * `cloudflare:workers` directly (it must keep working in Node, Vitest and the
 * Next.js server).
 */
export { getCfEnv, hasCfBinding } from '../../../../worker/cf/env';
