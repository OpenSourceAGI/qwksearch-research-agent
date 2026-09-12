# Collaboration server

The Hocuspocus server behind the Reason Editor's collaborative editing. It lives
inside `apps/qwksearch-web` rather than in an app of its own: a Yjs room is a
long-lived WebSocket holding CRDT state, which the deployed Cloudflare Worker
cannot hold, but every decision it makes — who is connecting, and what they may
do to a document — is answered by this app's API.

```bash
cd apps/qwksearch-web
bun run collab:dev   # ws://127.0.0.1:1234, restarts on change
bun run collab       # no watcher
```

Point the web app at it with `NEXT_PUBLIC_HOCUSPOCUS_URL`.

| File | Holds |
| --- | --- |
| `collaboration/server.ts` | The Hocuspocus bootstrap and `onAuthenticate` |
| `lib/collaboration/rooms.ts` | Room parsing and the authorisation decision, unit-tested without a socket |
| `app/api/collaboration/session` | Token → user (`REASON_AUTH_URL`) |
| `app/api/collaboration/access` | User + document → `read` / `write` / none (`REASON_DOCUMENT_ACL_URL`) |

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

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Listen port (default `1234`) |
| `REASON_SQLITE_PATH` | SQLite persistence file (default `./data/reason-editor.sqlite`) |
| `QWKSEARCH_API_URL` | Base URL of this app — wires up both endpoints below |
| `REASON_COLLAB_SECRET` | Shared secret sent to `/api/collaboration/access`; set it to the same value on the app |
| `REASON_AUTH_URL` | Overrides the session endpoint, to verify tokens somewhere else |
| `REASON_DOCUMENT_ACL_URL` | Overrides the document ACL endpoint |

Without `QWKSEARCH_API_URL` (or `REASON_AUTH_URL`) the server runs in demo mode,
where the token *is* the user id — fine locally, never in production. It is
**required** when `NODE_ENV=production`; the server throws rather than accepting
unverified tokens or granting blanket document access, and
`/api/collaboration/access` refuses to answer at all in production until
`REASON_COLLAB_SECRET` is set, so it never becomes an open "who can read what"
oracle.

For production also terminate TLS and use `wss://`.
