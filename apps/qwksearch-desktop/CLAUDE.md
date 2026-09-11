# CLAUDE.md — `apps/qwksearch-desktop`

SvelteKit + **Tauri** (`src-tauri/`). The desktop app: select text anywhere,
press `` ` ``, get a quick-search popup — plus tray, autostart and global
hotkey.

## The native behaviour is Rust-side, not `src/`

This is the usual wrong turn. The global hotkey, the tray, autostart and the
popup window all live in **`src-tauri/`**. Looking for them in the SvelteKit
`src/` wastes an hour.

## Things that bite

- **Rust toolchain required.** A machine that builds the rest of this repo
  cannot necessarily build this.
- **A global hotkey is a system-wide grab.** `` ` `` is a key people type. The
  capture must be precise about focus and modifiers, must release cleanly, and
  must not swallow the key in other applications.
- Per-OS behaviour genuinely differs (permissions for reading selected text on
  macOS, tray semantics on Linux). A green build on one platform says nothing
  about the others.
- It renders `packages/research-agent-ui`, so a change there ships here too.
