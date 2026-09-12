# CLAUDE.md — `react-reason-editor` (`packages/reason-editor`)

**npm name:** `react-reason-editor`. **Read
[`skills/ask-reason-editor`](../../../skills/ask-reason-editor/SKILL.md) and its
`API.md` first.**

REASON: the WYSIWYG document editor, on Tiptap. Nested document tree, AI
rewriting, collaborative editing, Google Docs import/export. Published; built.

## The export surface is enormous — and that is deliberate

Sixty-plus subpath exports, most of them one extension each (`./bold`,
`./table`, `./mermaid`, `./katex`, `./slashcommand`, …), plus `./editor-kit`,
`./bubble`, `./theme`, `./style.css`, `./reason-docs`, `./docs-agent`.

That shape is the feature: a consumer pays only for the extensions it imports.
So:

- **Add a new extension as its own subpath export.** Folding it into the barrel
  makes every consumer carry it.
- **Never reach past an export into `dist/` internals** — and don't let a
  consumer do it either.
- Removing or renaming an export is a breaking change for a published package.

## Rules

- **Document data loss is the worst bug this package can ship.** Anything
  touching the schema, serialization, or the Docs import/export round-trip needs
  a round-trip test.
- Collaborative editing runs through the Hocuspocus server inside the web app
  (`apps/qwksearch-web/collaboration/`, with the room rules in
  `apps/qwksearch-web/lib/collaboration/rooms.ts`). Schema changes affect live
  rooms — a Yjs document written by an old schema still has to load.
- **`src/docs-agent/plate/ui/*` are copies of Plate's shadcn registry, and the
  registry assumes plugins this package does not register.** The clearest case
  is AI: upstream's components call `editor.getApi(AIChatPlugin).aiChat.show()`
  on `@platejs/ai`, whereas this editor registers its own `KEYS.aiChat` plugin
  and reaches it through `getPlateAiController(editor)` (see
  `src/extensions/Ai/README.md` for why). `getApi` is typed off the plugin
  passed in, not off what the editor actually has, so a stale registry call
  type-checks cleanly and then throws in the browser. When you re-run the
  generator or copy a new component in, re-point its plugin calls and cover the
  wiring with a test — `test/docs-agent/plate-slash-ai.test.ts` is the pattern.
- The sidebar is a separate package: `reason-editor-sidebar`.
- This package is a **coverage-build dependency** in CI (as
  `react-reason-editor`).

```bash
cd packages/reason-editor && bun run test
```
