# Desktop, Browser Extension, VS Code Extension

These three all reuse backend packages (`search-web-api`, `chat-agent-toolkit`,
`qwksearch-api-client`, etc.) but each has its own UI shell. None of them
share UI code with `research-agent-ui` directly — they call the same QwkSearch
API instead.

## apps/qwksearch-desktop — Tauri + Svelte

"Select any text on screen, press \`\` ` \`\` to instantly search" (from the
root README). Svelte app (`svelte.config.js`, `vite.config.js`) with a Rust
Tauri shell (`src-tauri/`).

- `src/routes/+page.svelte`, `src/routes/+layout.js` — SvelteKit routing (small surface — this is a lightweight quick-search popup, not the full web UI).
- `src-tauri/` — native Rust side: window management, global hotkey registration, OS integration. Changes to hotkey behavior, tray icon, or OS-level permissions happen here, not in `src/`.
- Scripts are mostly packaging: `tauri`, `tauri:macos`, `docker:build:linux`, `docker:build:windows` (cross-compilation via Docker, since Tauri builds are OS-specific).
- Dependencies: `@tauri-apps/plugin-autostart`, `plugin-clipboard-manager`, `plugin-shell` — these map directly to Tauri capabilities the app uses (autostart on login, clipboard access for the "select text → search" flow, shelling out).

**When to edit here**: global hotkey behavior, native OS integration, the minimal quick-search popup UI. For anything resembling the full chat/search experience, that logic likely belongs in `research-agent-ui` and this app should just be calling the API.

## apps/qwksearch-ext — Browser extension (WXT)

"AI-powered tab manager" — separate from the "guest sidebar" concept in the
VS Code extension. Built with [WXT](https://wxt.dev), dev via `bun x wxt`
(root script: `bun run dev` inside this app), builds via `bun x wxt build`.

- `entrypoints/` — one folder/file per extension surface: `background.ts` (service worker), `content.ts` (content script injected into pages), `popup/` (toolbar popup UI), `sidepanel/` (browser side panel UI), `offscreen/` (offscreen document, typically for DOM/audio work service workers can't do directly).
- `components/`, `lib/`, `styles/` — shared UI (React + Tailwind, per `tailwind.config.ts`/`postcss.config.js`) and helpers used across entrypoints.
- `background/`, `content/` (top-level dirs alongside `entrypoints/`) — supporting logic split out from the entrypoint files themselves.
- `public/` — static assets (icons, manifest pieces WXT merges in).

**When to edit here**: tab management logic → `background.ts` + `lib/`; anything visible in the popup or side panel → `popup/`/`sidepanel/` + `components/`; page-level interaction (e.g. reading selected text, injecting UI into pages) → `content.ts`.

Note: this app has its own `pnpm-workspace.yaml` and `bun.lock` — it's
effectively a semi-independent workspace nested inside the monorepo; don't
assume root-level `bun install` alone wires up all of its dependencies if
things look missing, run install inside `apps/qwksearch-ext` too.

## apps/qwk-vscode-ext — VS Code extension

"Ask cited research questions from a sidebar in your editor... Sign in with
your account's API key, or use it signed-out as a guest." Two separate
embedded webview apps plus the extension host code:

- `src/extension.ts` — activation entry point, command registration.
- `src/panel.ts`, `src/reasonEditorProvider.ts` — manage the sidebar chat panel and a custom editor provider (for opening REASON documents inside VS Code).
- `src/apiProxy.ts`, `src/auth.ts` — talk to the QwkSearch backend and handle the API-key / guest auth flow mentioned in the README.
- `src/webviewHtml.ts`, `src/nonce.ts` — webview HTML scaffolding and CSP nonce generation (VS Code webviews require a strict CSP).
- `webview-ui/` — the **chat sidebar** webview app (its own `package.json`, Vite build). Build: `bun run build:webview`.
- `webview-ui-editor/` — the **REASON document editor** webview app, separate bundle. Build: `bun run build:webview-editor`.
- Root build (`bun run build` → `compile`) builds both webviews then runs `esbuild.mjs` to bundle the extension host itself. `bun run watch` runs esbuild in watch mode for host-code iteration; webview changes need their own rebuild (or run their dev server directly inside `webview-ui`/`webview-ui-editor` if one exists).

**When to edit here**: sidebar chat UI → `webview-ui/`; embedded document editor → `webview-ui-editor/` (likely wraps `reason-editor` or a subset of it — check its `package.json` dependencies before assuming it's a from-scratch editor); extension activation, commands, auth, or the API proxy → `src/`.

## apps/test-reports

Not a product surface — just a Cloudflare Worker (`wrangler.jsonc`) that
hosts the static Vitest HTML report produced by `bun run test:report` at
the root. Only relevant if you're changing CI/test-reporting infrastructure.
