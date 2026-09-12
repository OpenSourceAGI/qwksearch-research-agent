/**
 * App-side accessor for the Cloudflare Worker bindings.
 *
 * Re-exported from the Worker runtime helpers so `src/` and `packages/` code
 * can branch on bindings (KV, D1, Hyperdrive, Email) without importing the
 * `cloudflare:workers` virtual module themselves. Outside Workers every helper
 * reports "no bindings" and LobeHub keeps its default behaviour.
 */
export {
  getCfEnv,
  hasCfBinding,
  isCloudflareWorker,
  type LobeWorkerEnv,
} from '../../../worker/cf/env';
