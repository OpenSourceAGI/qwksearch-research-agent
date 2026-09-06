# REASON Editor

REASON is QwkSearch's writing half: a Tiptap-based rich-text editor and
document organizer, published as **`react-reason-editor`** from
[`packages/reason-editor`](../packages/reason-editor/). Research happens in the
chat/search surface; REASON is where the answer becomes a document — with
citations, structure, collaboration, and export.

## What it is

- **Editor core**: Tiptap (ProseMirror) with a config-driven extension set —
  not Lexical, and not `@lobehub/editor`. Extensions are built from an
  `EditorConfig` object (`editor-views/config/editorConfig`), so plugins can be
  toggled at runtime.
- **Formatting**: full text styling, H1–H6, lists/tasks, blockquotes,
  syntax-highlighted code blocks, callouts, tables with merge/split,
  multi-column layouts, collapsible sections.
- **Rich content**: image/video upload with drag-resize, GIF search,
  Twitter/X and iframe embeds, file attachments, KaTeX/LaTeX math,
  Excalidraw diagrams, Mermaid flowcharts.
- **Authoring aids**: slash commands, bubble menus, @ mentions, emoji picker,
  markdown paste, search & replace, HTML code view, drag-and-drop blocks,
  full keyboard shortcuts, LTR/RTL.
- **Documents**: nested document tree with tabs and outline panel
  (`ReasonDocs` shell), debounced auto-save, `.docx` import/export, PDF export.
- **Collaboration**: optional real-time editing via Yjs/Hocuspocus
  (`apps/collaboration-server` hosts the backend).
- **Theming/i18n**: dark/light, 8 accent themes, 6 interface languages.

## Package layout

```
packages/reason-editor/
├── src/
│   ├── editor/            Editor assembly; ReasonDocs full-app shell
│   ├── editor-views/      Toolbar, bubble menus, config-driven extension builder
│   ├── extensions/        Tiptap extensions (the feature list above)
│   ├── features/          Higher-level features (ai-rewrite, proofing, …)
│   ├── components/, dialogs/, comments/, hooks/
│   ├── app-{ui,styles,theme,types,utils,hooks}/   Organizer-app chrome
│   └── docs-agent/        In-editor document agent
├── demo/                  Six demo views (full app + 5 lighter assemblies)
├── EXTENSIONS.md          Per-extension reference
└── README.md              Usage, embedding recipes, props
```

## Using it

Every embedding follows one shape: create a Tiptap `editor` with `useEditor`,
wrap in `<RichTextProvider editor={editor}>`, render
`<EditorContent editor={editor} />` plus whichever chrome you import — full
toolbar, a few buttons, bubble menus only, outline, proofing, or the complete
file-tree app:

```tsx
// Full organizer app (sidebar, tabs, outline, dialogs) — no wiring needed
import ReasonDocs from 'react-reason-editor/src/editor/ReasonDocs';
import 'react-reason-editor/src/app-styles/split-pane.css';

export const FullApp = () => <ReasonDocs />;
```

The [package README](../packages/reason-editor/README.md) reproduces all six
demo assemblies; `EXTENSIONS.md` documents each extension's options.

### Dev commands (repo root)

- `bun run dev:editor` — standalone editor dev server (opens the organizer app)
- `bun run build:editor` — library build
- `cd packages/reason-editor && bun run test` — the editor's Vitest project
  (also part of the root `vitest.config.ts` registry)

In `apps/qwksearch-web`, REASON is consumed as a built workspace package — it
builds near the end of the web app's `prebuild` chain (after
`research-agent-ui`; `reason-editor-sidebar` builds before it, see #308/#309).

## REASON in the LobeHub-core architecture

Under the [LobeHub-as-core plan](./LOBEHUB_CORE_ENGINE_PLAN.md) (Phase 6),
REASON stays QwkSearch's writing surface, layered on top of the engine:

1. **Mounting** — a `/write` route in the engine SPA: a thin
   `src/features/Reason/` wrapper around `ReasonDocs` (consumed from npm),
   registered in `src/spa/router/desktopRouter.shared.tsx` per the engine's
   roots-vs-features convention.
2. **Storage** — documents persist through the engine's document/page model
   (Drizzle/Postgres) instead of QwkSearch's D1 tables; the document tree maps
   onto the engine's `document`/`page` stores.
3. **Research → writing** — a "Send to REASON" message action drops a cited
   answer (sources from the extraction pipeline) into the active document.
4. **AI rewrite** — `features/ai-rewrite` calls the engine's `model-runtime`
   with the user's configured provider key, applying results as
   `markdown-patch`-style diffs, not full-document replacement.
5. **Editor core stays Tiptap** — no port to `@lobehub/editor`. The
   integration seams are routing, storage, and model access; the ProseMirror
   layer is untouched, so REASON keeps working in the standalone demo, the
   VS Code extension, and the desktop app.

## Related

- [`LOBEHUB_CORE_ENGINE_PLAN.md`](./LOBEHUB_CORE_ENGINE_PLAN.md) — the architecture this doc slots into
- [`packages/reason-editor/README.md`](../packages/reason-editor/README.md) — full usage reference
- [`packages/reason-editor/EXTENSIONS.md`](../packages/reason-editor/EXTENSIONS.md) — extension catalog
- `apps/collaboration-server` — Yjs/Hocuspocus collaboration backend
