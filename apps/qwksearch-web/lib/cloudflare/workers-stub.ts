/**
 * Browser/client stub for the `cloudflare:workers` virtual module.
 *
 * Worker bindings only exist server-side. Some shared modules (e.g. the config
 * manager) read env vars at import time and are also pulled into the client
 * bundle; on the client those reads simply fall back to defaults, so an empty
 * `env` is sufficient and keeps `cloudflare:workers` resolvable in the client
 * build (where @cloudflare/vite-plugin does not provide it).
 */
export const env: Record<string, unknown> = {};

export default { env };
