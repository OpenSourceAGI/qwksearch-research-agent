-- The user layer of the search fan-out settings (migration to-do § 1.8, § 1.9, § 2.2).
--
-- One row per LobeHub Better Auth user id, holding a JSON `UserSearchOverrides`.
-- The search-side twin of 0002, and idempotent for the same reason: safe to
-- re-run against `qwksearch-new`.
--
-- The fan-out endpoint and its API key are never stored here. They name a host
-- the Worker sends requests and a bearer token to, so they stay Worker secrets
-- and `UserSearchOverrides` excludes them at the type level.

CREATE TABLE IF NOT EXISTS "search_settings" (
  "userId" text PRIMARY KEY,
  "overrides" text,
  "updatedAt" integer NOT NULL DEFAULT (unixepoch())
);
