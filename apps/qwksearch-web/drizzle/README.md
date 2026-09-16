# D1 migrations

Schema lives in `lib/database/schema.ts`. Migration files here are applied to the
`qwksearch-new` D1 database with Wrangler's **tracked** migrations, which record
every applied file in a `d1_migrations` table so re-running is a no-op.

```sh
pnpm db:generate        # drizzle-kit generate -> new NNNN_*.sql in this folder
pnpm db:migrate:status  # list migrations not yet applied to remote
pnpm db:migrate         # apply pending migrations to remote
pnpm db:migrate:local   # same, against .wrangler/state
```

`migrations_dir: "drizzle"` in `wrangler.jsonc` points Wrangler at this folder.

## Applying migrations is not optional

An unapplied migration does not fail loudly at deploy time — it fails later, at
runtime, as a query error. On 2026-09-08 Google sign-up broke in production with
`[Better Auth]: unable_to_create_user` because `0007_add_user_is_anonymous.sql`
had never been applied: the `anonymous()` plugin (`lib/auth/index.ts`) puts
`is_anonymous` in the Drizzle schema, so *every* new-user INSERT referenced a
column the live table did not have. Existing users could still sign in, so it
went unnoticed for a week.

**Run `pnpm db:migrate` as part of every release that adds a migration.** If you
want this enforced rather than remembered, change the `deploy` script to
`npm run db:migrate && vinext deploy`.

## One-time bootstrap

This folder predates tracked migrations: `0001`–`0005` were applied by hand and
their files are gone, and `0006_add_session_state.sql` is already applied in
production. Wrangler has no `d1_migrations` table yet, so its first run would
try to re-apply `0006` and fail on a duplicate column.

Record the already-applied file once, before the first `pnpm db:migrate`:

```sh
wrangler d1 execute qwksearch-new --remote --command "
  CREATE TABLE IF NOT EXISTS d1_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0006_add_session_state.sql');
"
```

Then `pnpm db:migrate:status` should show only `0007`, `0008`, and `0009` pending, and
`pnpm db:migrate` will apply them. After that this section is history.

Because `0001`–`0005` are missing, this folder cannot rebuild a database from
scratch — use `pnpm db:push` (drizzle-kit) for a fresh local or preview DB.
