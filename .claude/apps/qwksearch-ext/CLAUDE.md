# CLAUDE.md — `apps/qwksearch-ext`

The browser extension (WXT), at `apps/qwksearch-browser-ext`. Entrypoints:
`entrypoints/{background,content,sidepanel,offscreen,welcome}`.

## LeoTabs is merged in

`leotabs/` is the LeoTabs tab organizer, a plain-JS MV3 extension kept as-is
(MPL-2.0; it used to be `apps/qwktabs`). Its pages are copied into the build by
the `build:publicAssets` hook in `wxt.config.ts`; its `background.js` is
imported by `entrypoints/background.ts`; its own `manifest.json` is ignored, so
a permission or command it needs must be added to `wxt.config.ts`.
`leotabs/extension/lib/host.js` is the switch between embedded and standalone.
Its tests are `node --test` (`bun run test:leotabs`), not Vitest.

The toolbar click opens the side panel unless the "Open in a full tab" setting
(`chrome.storage.local` `qwkOpenInTab`, off by default) is on.

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
