# `qwksearch-desktop`

Select text in any application, press <kbd>Alt</kbd>+<kbd>`</kbd>, and the
selection opens as a QwkSearch query in your browser. A tray app that stays out
of the way: the window is 10×10 and hidden, and autostart is enabled on first
run.

SvelteKit for the (barely visible) UI, **Tauri 2** for everything that matters.

## What it does

| Behaviour | Where it lives |
| --- | --- |
| Registers the global `Alt+\`` hotkey | `src-tauri/src/hotkeys.rs` |
| Reads the current selection from the OS | `src-tauri/src/selection.rs` |
| Tray icon, window and plugin wiring | `src-tauri/src/setup.rs`, `main.rs` |
| Opens `https://qwksearch.com/?first=true&q=<selection>` | `hotkeys.rs` |
| Autostart on login, clipboard fallback | `src/routes/+page.svelte` via the Tauri plugins |

> **The native behaviour is Rust-side, not `src/`.** The hotkey, the tray,
> autostart and the popup all live in `src-tauri/`. Looking for them in the
> SvelteKit `src/` is the usual wrong turn.

It renders `packages/research-agent-ui`, so a change there ships here too.

## Configuration

**This app reads no environment variables.** There is no `.env`, no API key and
no sign-in — it opens a public URL in the user's default browser and holds no
credentials of its own. Anything you would configure lives in one of two files:

| What | Where | Default |
| --- | --- | --- |
| The hotkey | `src-tauri/src/hotkeys.rs` → `gs.register("Alt+\`")` | `Alt+\`` |
| The search URL | `src-tauri/src/hotkeys.rs`, and `searchEngines` in `src/routes/+page.svelte` | `https://qwksearch.com/?q=` |
| Bundle targets, identifier, window | [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json) | `deb`, `nsis`, `msi`, `app`, `dmg` · `com.qwksearch.app` |
| Tauri permissions | `src-tauri/capabilities/` | — |

The `searchEngines` map in `+page.svelte` has Perplexity, Google, DuckDuckGo
and YouTube commented out — uncomment one to offer it.

## Setup

Unlike the rest of the monorepo, this app needs a **Rust toolchain and the
platform's native webview libraries**. A machine that builds everything else
here cannot necessarily build this.

```bash
bun install                       # from the repo root
rustup toolchain install stable   # https://rustup.rs
```

Then the per-OS prerequisites from
[Tauri's setup guide](https://v2.tauri.app/start/prerequisites/) — on Debian or
Ubuntu that is `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`,
`libayatana-appindicator3-dev` and `librsvg2-dev`; the full list is in this
directory's [`Dockerfile`](./Dockerfile).

```bash
cd apps/qwksearch-desktop
bunx tauri dev                    # run it
bun run test                      # vitest
```

> `tauri.conf.json` points `beforeDevCommand` and `beforeBuildCommand` at
> `bun run dev` / `bun run build`, but `package.json` defines neither script.
> Add them (`vite dev` / `vite build`) before relying on `tauri dev`, or run
> Vite yourself on port 1420 alongside `tauri dev`.

## Building installers

Native, on the host OS:

```bash
bun run tauri            # deb, AppImage, nsis, msi, app, dmg — whatever the host supports
bun run tauri:macos      # just dmg + app
```

Both set `LINUXDEPLOY_SKIP_STRIP=1` and `NO_STRIP=true`; stripping breaks the
AppImage bundle.

Reproducibly, in Docker — this is how the Linux and Windows artifacts are
produced, and it needs no toolchain on the host beyond Docker:

```bash
bun run docker:build:linux && bun run docker:linux       # → dist/
bun run docker:windows                                   # builds and runs in one step
bun run docker:all
```

Output lands in `dist/`. The Linux image is [`Dockerfile`](./Dockerfile)
(Ubuntu 22.04, GTK + WebKitGTK); Windows cross-compilation is
[`Dockerfile.windows`](./Dockerfile.windows).

## Releasing

There is no store submission or auto-updater configured — `tauri.conf.json`
declares no updater endpoint and no signing keys. Distribution is the bundles
in `dist/`, attached to a GitHub release. Adding code signing or an updater
means adding `bundle.createUpdaterArtifacts` and a `plugins.updater` block, and
holding a signing key per platform; see
[Tauri distribution](https://v2.tauri.app/distribute/).

## Things that bite

- **A global hotkey is a system-wide grab.** <kbd>`</kbd> is a key people type.
  The capture must be precise about focus and modifiers, release cleanly, and
  not swallow the key in other applications.
- **Per-OS behaviour genuinely differs** — reading the selection needs
  Accessibility permission on macOS, and tray semantics vary on Linux. A green
  build on one platform says nothing about the others.
- `is_registered` only reflects registrations made by this process, so the code
  registers unconditionally and reports failure rather than pre-checking.
