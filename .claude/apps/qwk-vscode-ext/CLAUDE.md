# CLAUDE.md — `apps/qwk-vscode-ext`

The VS Code extension (`qwksearch-vscode`): search, ask and research the web
from inside the editor.

## Three build targets, one command

| Part | What it is |
| --- | --- |
| `src/` | The **extension host** — auth and the API proxy, bundled with esbuild |
| `webview-ui/` | The chat sidebar (Vite) |
| `webview-ui-editor/` | The editor webview (Vite) |

`bun run compile` builds all three. A change to one webview that compiles in
isolation can still break the host contract — build all of it.

## The host boundary

Webviews cannot make network calls or hold credentials. Everything goes through
the extension host's API proxy. So:

- A component that reaches for `fetch` against an absolute URL, or for browser
  APIs a webview lacks, works in the web app and fails here.
- **Credentials stay on the host side.** Never pass a token into a webview.
- Webview HTML needs a strict CSP and nonce'd scripts — don't loosen it to make
  something load.

It renders `packages/research-agent-ui` and `packages/reason-editor`; both are
much narrower here than in the web app.
