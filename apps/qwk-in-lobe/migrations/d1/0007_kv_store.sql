-- Redis-compatible key/value store on D1 (src/libs/redis/d1.ts), used in place of
-- an Upstash HTTP Redis: on Workers ioredis cannot open a TCP socket, so caches,
-- run guards and counters that LobeHub keeps in Redis live here instead.
-- Expiry is a millisecond timestamp; reads ignore expired rows and the store
-- sweeps them about once a minute. The store also creates these tables on first
-- use, for deployments that do not apply migrations/d1.
CREATE TABLE IF NOT EXISTS lobe_kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS lobe_kv_expires_at ON lobe_kv (expires_at);
CREATE TABLE IF NOT EXISTS lobe_kv_hash (
  key TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER,
  PRIMARY KEY (key, field)
);
CREATE INDEX IF NOT EXISTS lobe_kv_hash_expires_at ON lobe_kv_hash (expires_at);
