# Collaboration server

The [Hocuspocus](https://tiptap.dev/docs/hocuspocus/introduction) WebSocket
server behind the Reason Editor's collaboration rooms — the thing that makes two
people editing one document see each other's cursors and keystrokes.

It backs **both** editor engines in `packages/reason-editor`, persists every room
to SQLite, and verifies who may open which document before the first sync frame
goes out.

It lives inside `apps/qwksearch-web` rather than in an app of its own, but it is
a plain Bun process, not part of the Worker: Hocuspocus holds long-lived
WebSocket connections and a SQLite file, neither of which fits the Workers
runtime. What puts it here is that every decision it makes is answered by this
app's API.

| File | Holds |
| --- | --- |
| `collaboration/server.ts` | The Hocuspocus bootstrap and `onAuthenticate` |
| `lib/collaboration/rooms.ts` | Room parsing and the authorisation decision, unit-tested without a socket |
| `app/api/collaboration/session` | Token → user |
| `app/api/collaboration/access` | User + document → `read` / `write` / none |

## Setup

```bash
bun install                      # from the repo root
cd apps/qwksearch-web

bun run collab:dev               # ws://127.0.0.1:1234, with --watch
bun run collab                   # the same, without watching
bun run test                     # vitest, this app's whole suite
```

Nothing needs configuring to run it locally. Then point the web app at it:

```bash
# apps/qwksearch-web/.env
NEXT_PUBLIC_HOCUSPOCUS_URL=ws://127.0.0.1:1234
```

Without that variable the editor is single-player and never opens a socket.

## Rooms

Document names are `reason-editor:<engine>:<documentId>`, e.g.

```
reason-editor:tiptap:abc123
reason-editor:plate:abc123
```

`onAuthenticate` rejects anything else. The two engines deliberately never share
a room: Tiptap stores a ProseMirror document in the Yjs doc and Plate stores a
Slate document, so the states are not interchangeable. They stay separate until
there is an explicit document-conversion/export pipeline.

## Environment variables

There is no API key here — every variable points at something you run.

| Variable | Default | Enables | Where to get it |
| --- | --- | --- | --- |
| `PORT` | `1234` | The listen port. | Your own choice. |
| `REASON_SQLITE_PATH` | `./data/reason-editor.sqlite` | Where room state is persisted. | A path on a **persistent** volume — a container's ephemeral filesystem loses every document on restart. |
| `QWKSEARCH_API_URL` | — | Both checks below, against this app's own routes. | The origin this app is deployed at, e.g. `https://qwksearch.com`. |
| `REASON_COLLAB_SECRET` | — | Proves a request to `/api/collaboration/access` came from this server. Sent as `x-collaboration-secret`. | A random string; set the same value on the Worker (`wrangler secret put`). |
| `REASON_AUTH_URL` | `<QWKSEARCH_API_URL>/api/collaboration/session` | Verifies the connection token. Called as `GET <url>` with `Authorization: Bearer <token>`; must return `{ id, name }` for a valid token and a non-2xx status otherwise. | Only needed to point the server at a session endpoint other than this app's. |
| `REASON_DOCUMENT_ACL_URL` | `<QWKSEARCH_API_URL>/api/collaboration/access` | Document-level access control. Called as `GET <url>?documentId=…&userId=…`; must return `{ role: "read" \| "write" }`, or a non-2xx status to deny. | Only needed to point the server at an ACL endpoint other than this app's. |

**`QWKSEARCH_API_URL` (or both `REASON_*_URL`) is required when
`NODE_ENV=production`.** Unset, the server runs in demo mode, where the token
*is* the user id — anyone can claim any identity — and every authenticated user
gets `write` on every document. Rather than carry either into production, the
server throws on startup.

`/api/collaboration/access` is the one route in this app that names a user
instead of reading the caller's session, which would make it a "who can read
what" oracle if left open. It refuses to answer at all in production until
`REASON_COLLAB_SECRET` is set on the Worker, and rejects any caller that does not
send it.

## Deploying

```bash
bun run collab
```

There is no Dockerfile or host config committed here — it is a long-lived Bun
process, so run it anywhere that gives you one (a VM, a container host, Fly,
Railway, Render). Whatever you pick:

1. Set `NODE_ENV=production` and `QWKSEARCH_API_URL` — the process refuses to
   start without a way to verify tokens, by design — and set
   `REASON_COLLAB_SECRET` here and on the Worker.
2. Mount a persistent volume and point `REASON_SQLITE_PATH` at it. SQLite on an
   ephemeral disk means every collaborative document disappears on the next
   deploy.
3. **Terminate TLS and serve `wss://`.** A page on `https://` cannot open a
   `ws://` socket, so a plaintext listener does not merely leak — it does not
   work at all from the deployed web app.
4. Make sure your proxy passes WebSocket upgrades through and does not cap idle
   connections at something short; these sockets are meant to stay open.
5. Set `NEXT_PUBLIC_HOCUSPOCUS_URL` on the web app to the `wss://` origin.

Run one instance. Hocuspocus keeps room state in memory backed by the local
SQLite file, so two instances behind a round-robin load balancer would give the
same document two divergent histories.
