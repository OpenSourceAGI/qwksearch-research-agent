# collaboration-server

Hocuspocus server backing the Reason Editor's collaboration rooms for both
editor engines.

```bash
cd apps/collaboration-server
bun run dev          # ws://127.0.0.1:1234
```

Point the web app at it with `NEXT_PUBLIC_HOCUSPOCUS_URL`.

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
| `REASON_AUTH_URL` | Session endpoint that verifies the connection token and returns `{ id, name }` |
| `REASON_DOCUMENT_ACL_URL` | Endpoint returning `{ role: 'read' \| 'write' }` for a `documentId`/`userId` pair |

Without `REASON_AUTH_URL` the server runs in demo mode, where the token *is* the
user id — fine locally, never in production. Both variables are **required** when
`NODE_ENV=production`; the server throws rather than accepting unverified tokens
or granting blanket document access.

For production also terminate TLS and use `wss://`.
