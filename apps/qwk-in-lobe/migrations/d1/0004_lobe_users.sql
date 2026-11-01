-- Lobe's users (`lobeUsers` in worker/qwksearch/schema.ts).
--
-- Every browser that reaches the Worker is a guest user, identified by its
-- `lobe_uid` cookie. The same id is the LobeHub user id in Postgres, where the
-- user's chats, agents and provider keys live. Idempotent like 0002/0003, so it
-- is safe to re-run against `qwksearch-new`.

CREATE TABLE IF NOT EXISTS "lobe_users" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text DEFAULT 'guest' NOT NULL,
  "email" text,
  "name" text,
  "createdAt" integer DEFAULT (unixepoch()) NOT NULL,
  "lastSeenAt" integer DEFAULT (unixepoch()) NOT NULL,
  CONSTRAINT "uq_lobe_users_email" UNIQUE("email")
);

CREATE INDEX IF NOT EXISTS "idx_lobe_users_lastSeenAt" ON "lobe_users" ("lastSeenAt");
