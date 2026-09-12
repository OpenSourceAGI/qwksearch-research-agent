# CLAUDE.md — `research-agent-ui`

**Read [`skills/ask-research-agent-ui`](../../../skills/ask-research-agent-ui/SKILL.md)
and its `API.md` first.**

The QwkSearch app UI: the conversation window, search results, the article
reader, uploads and settings. Published; built.

## The app renders this package — it does not own the UI

`apps/qwksearch-web` wires this up. If you are about to add a component to the
app that belongs to the chat window, the result list or the reader, it belongs
here instead. That separation is why the same UI ships in the web app, the
desktop app, the extension and the VS Code extension.

Consequence: **a change here ships to four shells at once.** Check the ones with
different constraints — the VS Code webview and the browser extension side panel
are narrow, and neither has the web app's origin.

## Entries

`.` · `./workspace` · `./config` · `./api` · `./file-sources` · `./settings` ·
`./settings/*`

Import from these, never from `dist/` internals.

## The spotlight palette

`src/components/SpotlightPalette/` is the Ctrl-Space overlay that searches
chats, pages, settings and actions — ported from CardMirror's quick-card search
palette in debate-ai, prefix system and ranking included. `QwkSearchProviders`
mounts it, so all four shells get it; `showSpotlight={false}` opts out.

Keep the split: `spotlightMatch.ts` and `spotlightItems.ts` are pure (a builder
takes a `SpotlightContext` of callbacks, never a hook), and only
`SpotlightPalette.tsx` touches React context or the router. That is what lets
the sources and the ranking be tested without mounting the app.

## Rules

- Keep it prop-driven and transport-agnostic: `./api` is the seam. A component
  that hardcodes an endpoint can't run in the extension.
- Rendered content (search results, extracted articles, uploads) is untrusted.
  Sanitize at the boundary.
- Settings UI comes from `shadcn-settings`; the dock from `shadcn-app-dock`.
  Compose them rather than reimplementing.
- **The shell mounts no sidebar of its own.** Settings, Login/Logout and the
  theme picker live in the dock's Settings menu (`app/CategoryDock.tsx`).
  A sidebar here mounts on *every* surface the shell wraps, `/workspace`
  included, where it overlays REASON's own sidebar — its toggle lands on
  REASON's trigger and its collapsed rail leaves a second rail beside it.
  That was #420, reverted by #430; `test/appShellChrome.test.ts` holds the
  line in both directions.

```bash
cd packages/research-agent-ui && bun run test
```
