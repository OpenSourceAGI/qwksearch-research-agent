# CLAUDE.md — `apps/qwksearch-ext`

The browser extension (WXT). Entrypoints:
`entrypoints/{background,content,popup,sidepanel,offscreen}`.

## It has its own workspace — install inside it

This app carries its **own `pnpm-workspace.yaml` and lockfile**. A root
`bun install` is not enough: install inside this directory too, or the build
fails in ways that look unrelated.

## Extension constraints

- **Manifest permissions are the security surface.** A new host permission or a
  broad content-script match widens what the extension can read on every page
  the user visits. Keep them minimal and justify additions in the PR.
- **No remote code.** Stores reject it; bundle everything.
- The MV3 background is a **service worker**: torn down and restarted at will.
  Don't keep state in module scope and expect it to survive.
- `content` scripts run in someone else's page — never trust the DOM you find,
  and don't leak the extension's privileges into it.
- Each entrypoint has a different environment. `offscreen` exists specifically
  for work the service worker cannot do; don't collapse them.

It renders `packages/research-agent-ui` in the side panel, which is much
narrower than the web app — check layout there.
