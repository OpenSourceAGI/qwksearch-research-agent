# QwkSearch for VS Code

Search, ask, and research the web from a sidebar in VS Code — the same
research agent that powers [qwksearch.com](https://app.qwksearch.com), packaged
as a VS Code extension and talking to the live QwkSearch API.

<p align="center">
<img width="280" src="media/icon.png" alt="QwkSearch icon" />
</p>

## Features

- **Chat sidebar** — ask a question, get a cited, streamed answer without
  leaving the editor.
- **Web-search citations** — sources are shown as clickable links (opened in
  your default browser).
- **Ask About Selection** — select text in any file, right-click, and choose
  "QwkSearch: Ask About Selection" to send it straight to the composer.
- **Sign in** — connect your QwkSearch account to use your own configured
  models/API keys and higher rate limits. Works signed-out too (as a guest),
  same as the website.
- **Works against your own deployment** — point `qwksearch.apiBaseUrl` at a
  self-hosted `qwksearch-web` instance instead of the public one.

## Why this isn't a literal re-export of `research-agent-ui`

[`research-agent-ui`](../../packages/research-agent-ui) is a React component
library built specifically for Next.js apps: it uses `next/navigation`
(`useRouter`, `useSearchParams`, dynamic `/c/[chatId]` routes) and `next/image`
throughout, and its data hooks call relative paths like `fetch("/api/agent/chat")`
expecting to be mounted *inside* a Next.js app (exactly how `qwksearch-web`
uses it — see `apps/qwksearch-web/app/layout.tsx` and `app/page.tsx`). A VS
Code webview has no Next.js router and no same-origin server to answer those
relative paths, so the component tree can't be dropped in unmodified.

Instead, this extension is a small, purpose-built webview UI that:

- mirrors the same visual language and interaction model (message bubbles,
  streamed markdown, live "searching…" pills, source citations, focus-mode /
  category selectors) as `research-agent-ui`'s `ChatWindow`,
- reuses its **wire protocol** — it sends the exact same request shape to
  `POST /api/agent/chat` and parses the same newline-delimited JSON event
  stream (`sources` / `searching` / `message` / `messageEnd` / `error`) that
  `research-agent-ui/src/hooks/useChat/sendMessage.ts` produces, and the same
  `GET /api/agent/providers` model-selection logic as `chatConfig.ts`,

so it stays behaviorally compatible with the real API without requiring a
Next.js runtime inside the editor. If VS Code ever ships a way to host a full
Next.js server per-webview, the two could converge; until then this is the
pragmatic boundary.

## Architecture

```
┌─────────────────────────────┐        HTTPS        ┌──────────────────────┐
│ Webview (webview-ui/)       │  postMessage/JSON    │ Extension Host       │
│ React + Vite, sandboxed,    │◄────────────────────►│ src/*.ts, Node       │──► https://app.qwksearch.com/api/*
│ no direct network access    │                       │ holds the API key    │
└─────────────────────────────┘                       └──────────────────────┘
```

- **`webview-ui/`** — a small Vite + React app rendered inside a VS Code
  `WebviewView`. It never sees your API key; it only exchanges typed
  `postMessage` events with the extension host (see `src/protocol.ts`).
- **`src/panel.ts`** — the `WebviewViewProvider`. Proxies `apiRequest`
  messages from the webview to the real QwkSearch API (`src/apiProxy.ts`),
  attaching `Authorization: Bearer <apiKey>` and streaming the response back
  chunk by chunk so answers render as they're generated.
- **`src/auth.ts`** — owns the API key. It's stored in VS Code's
  `SecretStorage` (OS keychain), never in a file or in extension state.

### Login flow

QwkSearch's web session is a browser cookie (better-auth), which a VS Code
webview can't hold across the extension host / webview process boundary. So
instead the extension authenticates with a **personal API key**:

1. Run **QwkSearch: Sign In** (or click "Sign In" in the sidebar).
2. Choose "Open QwkSearch to get a Key" — this opens your browser to
   `{apiBaseUrl}/settings`, where (once logged in) your account's API key is
   shown under Account, with a copy button.
3. Paste the key into the input box that appears in VS Code. It's saved to
   SecretStorage and used for every subsequent request.
4. **QwkSearch: Sign Out** clears it.

This required one small, additive change on the server side: `getSession()`
in `apps/qwksearch-web/lib/auth/session.ts` now also accepts
`Authorization: Bearer qwk_...` as an alternative to the cookie session,
resolving straight to the matching user. Cookie-based login on the website is
completely unaffected.

You can skip signing in entirely — chat works signed-out (as a guest, same as
the website), just with the default shared rate limits/models instead of your
own account's configuration.

## Project layout

```
apps/qwk-vscode-ext/
├── src/                  # extension host (Node, bundled with esbuild)
│   ├── extension.ts      # activation, commands
│   ├── auth.ts           # SecretStorage-backed API key management
│   ├── apiProxy.ts       # streaming fetch proxy to the QwkSearch API
│   └── panel.ts          # WebviewViewProvider + postMessage protocol
├── webview-ui/           # the sidebar UI (Vite + React, separate build)
│   └── src/
├── media/icon.png
└── esbuild.mjs           # bundles src/extension.ts -> dist/extension.js
```

## Development

```bash
# from apps/qwk-vscode-ext
bun install
cd webview-ui && bun install && cd ..

bun run compile     # builds webview-ui/dist and dist/extension.js once
bun run watch        # rebuilds the extension host on change (run `cd webview-ui && bun run dev` separately if iterating on the UI in a browser tab)
```

Then press **F5** in VS Code (with this folder open) to launch an Extension
Development Host with QwkSearch loaded, or open the QwkSearch icon in the
Activity Bar.

### Packaging

```bash
bun run package      # production build (dist/, webview-ui/dist/)
bunx @vscode/vsce package   # produces a .vsix you can install or publish
```

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `qwksearch.apiBaseUrl` | `https://app.qwksearch.com` | Base URL of the QwkSearch deployment to use. Point at a self-hosted `qwksearch-web` instance to use your own. |
| `qwksearch.focusMode` | `webSearch` | Default research focus for new questions: `webSearch` (cited web search) or `writingAssistant` (no search). |

## Commands

| Command | Description |
| --- | --- |
| `QwkSearch: Sign In` | Store your QwkSearch API key |
| `QwkSearch: Sign Out` | Remove the stored API key |
| `QwkSearch: Open Research Agent` | Focus the sidebar |
| `QwkSearch: Ask About Selection` | Send the current editor selection to the composer |

## Limitations / roadmap

- No persistent chat history across VS Code sessions yet (`research-agent-ui`
  persists chats via `/api/agent/chats`, which is straightforward to wire up
  next).
- No file attachments, image/video search, or article-reader panel — the
  extension focuses on the core ask → cited-answer loop.
- Model/category pickers are simplified compared to `ModelSelector` /
  `CategoriesMenu`; they cover the common cases (auto-picks OpenRouter/Nvidia
  + a Nemotron model, same priority order as `chatConfig.ts`).
