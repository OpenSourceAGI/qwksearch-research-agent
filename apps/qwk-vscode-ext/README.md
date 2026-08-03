# QwkSearch for VS Code

Search, ask, and research the web from a sidebar in VS Code — the same
research agent that powers [qwksearch.com](https://qwksearch.com), packaged
as a VS Code extension and talking to the live QwkSearch API.

<p align="center">
<img width="280" src="media/icon.png" alt="QwkSearch icon" />
</p>

## Features

- **Chat sidebar** — ask a question, get a cited, streamed answer without
  leaving the editor. Lives in its own Activity Bar container, keeps its
  state when you switch to another sidebar view, and can be reached from any
  file via **QwkSearch: Open Research Agent**.
- **Web-search citations** — sources are shown as clickable links (opened in
  your default browser).
- **Ask About Selection** — select text in any file, right-click, and choose
  "QwkSearch: Ask About Selection" to send it straight to the composer.
- **Reason editor for `.md` and `.docx`** — opening a Markdown or Word file
  loads it in [`react-reason-editor`](../../packages/reason-editor)'s
  rich-text (WYSIWYG) surface instead of plain text, with its full toolbar
  (tables, images, KaTeX, Mermaid, comments, Word import/export, ...). An
  **Ask QwkSearch** button in its toolbar sends the current selection (or the
  whole document, if nothing's selected) straight to the chat sidebar. See
  [Reason editor as the default `.md`/`.docx` handler](#reason-editor-as-the-default-mddocx-handler) below.
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
│ React + Vite, sandboxed,    │◄────────────────────►│ src/*.ts, Node       │──► https://qwksearch.com/api/*
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

## Reason editor as the default `.md`/`.docx` handler

Two [custom editors](https://code.visualstudio.com/api/extension-guides/custom-editors)
register `react-reason-editor` as the **default** editor for `*.md` and
`*.docx` files (`qwksearch.reasonEditor.markdown` / `.docx` in
`package.json`'s `customEditors` contribution), backed by a small shared
webview app in `webview-ui-editor/`:

- **`.md`** uses `vscode.CustomTextEditorProvider`, so it rides VS Code's
  normal `TextDocument` for Save, Undo, hot-exit, and picking up external
  changes (e.g. `git checkout`) — the extension only translates between the
  Markdown source and the HTML the editor mounts (`marked` in, `turndown`
  out). Because a round-trip through the editor's HTML only preserves what
  its schema can express, an edited file is re-serialized in the editor's own
  canonical Markdown style rather than preserving the original's exact
  formatting byte-for-byte outside the lines you touched — the same tradeoff
  WYSIWYG Markdown tools like Typora or Obsidian's rich mode make.
- **`.docx`** uses the binary `vscode.CustomEditorProvider` API (there's no
  `TextDocument` for a Word file); `mammoth` renders the file to HTML on open,
  and `html-to-docx` serializes the edited HTML back to `.docx` bytes on
  save. Undo/redo across edits is the editor's own (Tiptap) history rather
  than VS Code's edit stack — see the doc comment on `ReasonDocxDocument` in
  `src/reasonEditorProvider.ts` for why.

Both editors ship the same **Ask QwkSearch** toolbar button as the reason
editor's toolbar (see Features above), which is how the two integrations tie
together: research a topic in the sidebar, or select a paragraph you're
writing and send it to the sidebar to fact-check or expand on.

**Opting out per-file or globally:** since this replaces VS Code's built-in
Markdown editor by default, use **Reopen Editor With…** (right-click the tab,
or the command palette) to open a specific file as plain text instead, or set
`"workbench.editorAssociations": { "*.md": "default" }` in your settings to
turn it off everywhere.

## Project layout

```
apps/qwk-vscode-ext/
├── src/                       # extension host (Node, bundled with esbuild)
│   ├── extension.ts           # activation, commands, provider registration
│   ├── auth.ts                 # SecretStorage-backed API key management
│   ├── apiProxy.ts             # streaming fetch proxy to the QwkSearch API
│   ├── panel.ts                 # chat WebviewViewProvider + postMessage protocol
│   ├── reasonEditorProvider.ts   # .md / .docx CustomEditorProviders
│   ├── webviewHtml.ts           # shared webview HTML shell + CSP
│   └── nonce.ts
├── webview-ui/                # the chat sidebar UI (Vite + React, separate build)
│   └── src/
├── webview-ui-editor/          # the reason-editor UI shared by both custom editors
│   └── src/
├── media/icon.png
└── esbuild.mjs                # bundles src/extension.ts -> dist/extension.js
```

## Development

```bash
# from apps/qwk-vscode-ext
bun install
cd webview-ui && bun install && cd ..
cd webview-ui-editor && bun install && cd ..

bun run compile     # builds webview-ui/dist, webview-ui-editor/dist, and dist/extension.js once
bun run watch        # rebuilds the extension host on change (run `bun run dev` inside webview-ui/ or webview-ui-editor/ separately if iterating on either UI in a browser tab)
```

Then press **F5** in VS Code (with this folder open) to launch an Extension
Development Host with QwkSearch loaded, or open the QwkSearch icon in the
Activity Bar.

### Packaging

```bash
bun run package      # production build (dist/, webview-ui/dist/, webview-ui-editor/dist/)
bunx @vscode/vsce package   # produces a .vsix you can install or publish
```

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `qwksearch.apiBaseUrl` | `https://qwksearch.com` | Base URL of the QwkSearch deployment to use. Point at a self-hosted `qwksearch-web` instance to use your own. |
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
- The reason editor doesn't preserve a `.docx` file's original layout details
  (headers/footers, tracked changes, custom styles) across a save — only
  what Tiptap's schema can express round-trips. Saved Markdown is
  re-serialized in the editor's own canonical style rather than a minimal
  diff of the original file.
- No Settings modal (plugin toggles, language/theme picker) in the embedded
  editor yet — it always mounts the full default extension set from
  `react-reason-editor/editor-kit`'s `createDefaultConfig()`.
