<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# collaboration-server

The [Hocuspocus](https://tiptap.dev/docs/hocuspocus/introduction) WebSocket
server behind the Reason Editor's collaboration rooms — the thing that makes
two people editing one document see each other's cursors and keystrokes.

It backs **both** editor engines in `packages/reason-editor`, persists every
room to SQLite, and verifies who may open which document before the first sync
frame goes out.

A plain Bun process, not a Worker: Hocuspocus holds long-lived WebSocket
connections and a SQLite file, neither of which fits the Workers runtime.

## Setup

```bash
bun install                      # from the repo root
cd apps/collaboration-server

bun run dev                      # ws://127.0.0.1:1234, with --watch
bun run start                    # the same, without watching
bun run test                     # vitest
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

There is no `.env.example` and no API key — every variable here points at
something you run, so none of them is fetched from a third party.

| Variable | Default | Enables | Where to get it |
| --- | --- | --- | --- |
| `PORT` | `1234` | The listen port. | Your own choice. |
| `REASON_SQLITE_PATH` | `./data/reason-editor.sqlite` | Where room state is persisted. | A path on a **persistent** volume — a container's ephemeral filesystem loses every document on restart. |
| `REASON_AUTH_URL` | — | Verifies the connection token. Called as `GET <url>` with `Authorization: Bearer <token>`; must return `{ id, name }` for a valid token and a non-2xx status otherwise. | An endpoint on your own deployment — for `apps/qwksearch-web`, a route that resolves a better-auth session. |
| `REASON_DOCUMENT_ACL_URL` | — | Document-level access control. Called as `GET <url>?documentId=…&userId=…`; must return `{ role: "read" \| "write" }`, or a non-2xx status to deny. | The same — an endpoint you write next to your document store. |

**Both URLs are required when `NODE_ENV=production`.** With `REASON_AUTH_URL`
unset the server runs in demo mode, where the token *is* the user id — anyone
can claim any identity — and with `REASON_DOCUMENT_ACL_URL` unset every
authenticated user gets `write` on every document. Rather than carry either
into production, the server throws on startup.

## Deploying

```bash
bun run start
```

There is no Dockerfile or host config committed here — it is a long-lived Bun
process, so run it anywhere that gives you one (a VM, a container host, Fly,
Railway, Render). Whatever you pick:

1. Set `NODE_ENV=production`, then `REASON_AUTH_URL` and
   `REASON_DOCUMENT_ACL_URL` — the process refuses to start without them, by
   design.
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
