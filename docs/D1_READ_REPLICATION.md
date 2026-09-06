# D1 read replication

`qwksearch-new` runs its primary instance in WNAM. With read replication turned
on, D1 also keeps a replica in every supported region (ENAM, WNAM, WEUR, EEUR,
APAC, OC) and answers reads from the one nearest the request. The saving is
network round trips — a read from Europe stops crossing an ocean twice — not
query time.

The catch is that a replica can lag the primary. Left alone, that means a user
can write a row and then not see it on the next page load. The Sessions API is
the fix: every query in a session carries a *bookmark*, and D1 refuses to serve
that session a database version older than anything it has already seen. Reads
stay fast and stay sequentially consistent.

## What is wired up

`apps/qwksearch-web/lib/database/d1-session.ts` owns this. Per request:

1. The Worker entry opens a session scope, seeded with the bookmark the client
   returned from its previous request (the `x-d1-bookmark` header for API
   clients, the `d1_bookmark` cookie for browser navigations).
2. The `DB` binding is wrapped by `sessionedD1()`, so every statement
   drizzle prepares runs inside that one session.
3. The session's closing bookmark goes back on the response, so the client's
   next request resumes from at least this version.

Where a session starts, when the client has no bookmark to resume from:

| Request | Starts on | Why |
| --- | --- | --- |
| `GET` / `HEAD` | any replica (`first-unconstrained`) | lowest latency; nothing has been written to miss |
| everything else | the primary (`first-primary`) | a handler that writes and reads back must not miss its own write |
| cron / background | the primary (`first-primary`) | no client bookmark exists, and these jobs write |

Requests that never touch D1 never open a session, which is what keeps the
bookmark cookie off static and otherwise cacheable responses.

## Turning replication on

Read replication is a property of the database, not of the Worker, so
wrangler.jsonc cannot carry it. Either:

- Cloudflare dashboard → D1 → `qwksearch-new` → Settings → Enable Read Replication, or
- `apps/qwksearch-web/scripts/d1-read-replication.sh enable`, with `CLOUDFLARE_ACCOUNT_ID`
  and a `CLOUDFLARE_API_TOKEN` holding `D1:Edit`.

`apps/qwksearch-web/scripts/d1-read-replication.sh status` prints the database's current
`read_replication.mode` (`auto` = on, `disabled` = off).

The two halves are independent and can be done in either order: the Sessions
API is a no-op on a database with replication off, and disabling replication
later leaves this code working (replicas take up to 24 hours to stop serving).

## Knobs

Both are plain Worker Variables, so they can be changed in the dashboard
without a redeploy.

- `D1_SESSION_MODE` — `auto` (default), `primary` (always start on the primary),
  `unconstrained` (always start anywhere), or `off` (bypass the Sessions API
  entirely; the rollback switch).
- `D1_SESSION_DEBUG` — when set, responses carry `x-d1-served-by-region` and
  `x-d1-served-by-primary` from the last query's `meta`, so you can see which
  instance actually answered. These fields are `undefined` under
  `wrangler dev`; they only appear for remote D1 requests.
