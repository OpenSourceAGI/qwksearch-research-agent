/** `ioredis` shim: Redis over TCP is not reachable from Workers; use DISABLE_REDIS=1. */
export class Redis {
  constructor() {
    throw new Error(
      '[lobehub-workers] ioredis is not available on Cloudflare Workers. Set DISABLE_REDIS=1 (in-memory fallbacks are used).',
    );
  }
}
export class Cluster extends Redis {}
export default Redis;
