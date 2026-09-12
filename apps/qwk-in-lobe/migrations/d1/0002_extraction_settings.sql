-- The user layer of the article extraction settings (migration to-do § 1.5, § 2.2).
--
-- One row per LobeHub Better Auth user id, holding a JSON `UserExtractionOverrides`.
-- Idempotent, like 0001, so it is safe to re-run against `qwksearch-new`.

CREATE TABLE IF NOT EXISTS "extraction_settings" (
  "userId" text PRIMARY KEY,
  "overrides" text,
  "updatedAt" integer NOT NULL DEFAULT (unixepoch())
);
