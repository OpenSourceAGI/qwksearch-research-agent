/**
 * Empty module for optional native addons (zlib-sync, bufferutil, erlpack…)
 * that libraries probe for at import time. On Workers they are never present,
 * and the libraries already fall back to pure-JS code paths.
 */
const empty: Record<string, unknown> = {};
export default empty;
