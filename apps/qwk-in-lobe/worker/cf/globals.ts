/**
 * Captures the Worker bindings into a process-wide slot.
 *
 * LobeHub's server code reads configuration through `process.env` and creates
 * singletons at module-evaluation time (for example `serverDB`). Bindings such
 * as Hyperdrive, KV, D1, R2 and the Email sender are only reachable through the
 * Worker `env`, so this module must be the FIRST import of the Worker entry:
 * every module evaluated afterwards can reach the bindings synchronously
 * through `getCfEnv()` and sees every string var/secret on `process.env`.
 */
import { env } from 'cloudflare:workers';

import { setCfEnv } from './env';

setCfEnv(env as never);

// `nodejs_compat` mirrors vars/secrets onto `process.env`, but only once the
// first request is being handled; LobeHub's env schemas run during module
// evaluation, so mirror the string bindings eagerly here.
const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env;

if (processEnv) {
  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    if (typeof value === 'string' && processEnv[key] === undefined) processEnv[key] = value;
  }
}
