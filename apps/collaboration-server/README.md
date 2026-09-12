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
