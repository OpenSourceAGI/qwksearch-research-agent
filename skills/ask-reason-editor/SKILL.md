---
name: ask-reason-editor
description: Guide to react-reason-editor (packages/reason-editor), the REASON document editor — the two engines (Plate by default, Tiptap for the features not yet ported), the ReasonDocs app shell and its injected sidebar, NovelEditor / RichTextProvider / editor-kit for hosts that own their own document lifecycle, buildExtensions and the 59-extension registry with its per-extension subpath exports, the shortcut registry, 21 locales, the CDN-vs-bundled external-libs switch, and Yjs collaboration. Use when adding or configuring an editor extension, embedding the editor in another host, changing the toolbar or bubble menus, debugging a schema remount, or wiring collaborative editing.
---

# Working With react-reason-editor

`packages/reason-editor`, published as **react-reason-editor**. The writing side of the
product — not to be confused with `research-agent-ui`, which is the chat side. Its file
sidebar lives in a separate package (**ask-reason-editor-sidebar**) so the dependency
stays one-way: `reason-editor` depends on the sidebar, never the reverse.

Note two naming traps: the directory is `reason-editor` but the package is
`react-reason-editor`, and `packages/readme.md` still calls it Lexical — it is
**Tiptap and Plate**.

## Two engines

`ReasonDocs`'s `editorEngine` prop defaults to **`'plate'`**; `'tiptap'` selects the
older stack, which still carries the features not yet ported (inline comments among
them). Both trees are in the dependency list (44 `@tiptap/*`, 32 `@platejs/*`), which
is why this package is heavy. Check which engine a surface mounts before assuming an
extension applies to it.

## Picking an entry point

| You want | Import |
| --- | --- |
| The whole document app (sidebar, tree, tabs, editor) | `ReasonDocs` from `react-reason-editor` |
| An editor surface in a host that owns load/save (a VS Code custom editor, say) | `react-reason-editor/editor-kit` |
| To mount the editor and place the editable area yourself | `NovelEditor` / `useNovelEditor` |
| To supply your own `useEditor` instance | `RichTextProvider` |
| One extension only | its own subpath — `react-reason-editor/table`, `/katex`, `/mermaid`, `/slashcommand`, … |
| The three comparison surfaces (`ReasonTiptapEditor`, `ReasonPlateEditor`, `ReasonPlaygroundEditor`) | `react-reason-editor/docs-agent` |
| `ReasonDocs` alone, with its split-pane CSS | `react-reason-editor/reason-docs` |
| Translations | `react-reason-editor/locale-bundle` |
| Theme tokens | `react-reason-editor/theme` |
| Bubble menus / toolbar | `RichTextToolbar`, `BubbleMenus` from `/editor-kit` |
| Styles | `react-reason-editor/style.css` — a separate import, not injected |

## Setup with editor-kit

```tsx
import {
  NovelEditor, RichTextToolbar, BubbleMenus,
  buildExtensions, createDefaultConfig,
} from "react-reason-editor/editor-kit";
import "react-reason-editor/style.css";

const config = createDefaultConfig();
<NovelEditor extensions={buildExtensions(config)} initialContent={html} rebuildKey={sig}>
  {({ editor, EditorSurface }) => (<><RichTextToolbar /><EditorSurface /><BubbleMenus /></>)}
</NovelEditor>
```

`NovelEditor` hands back `{ editor, EditorSurface }`; render `EditorSurface` **exactly
once** anywhere in your layout. `extensions` is the *whole* schema — Novel's own bundled
extensions are deliberately not merged in.

## Recipes

**Change the extension set at runtime.** Pass a new `rebuildKey` (e.g.
`extensionsSignature(config)`) whenever `extensions` changes; without it the editor
keeps its old schema and the change appears to do nothing.

**Add an extension.** Create `src/extensions/<Name>/` following an existing one, register
it in the plugin registry (`src/editor-views/config/pluginRegistry.tsx`) so it gets a
config entry and a Settings toggle, and add its `./<name>` subpath to `package.json`'s
`exports` if it should be importable standalone. `createDefaultConfig()` derives its
`plugins` map from `PLUGIN_REGISTRY`, so registering is what makes it configurable.

**EditorConfig.** `{ language, theme: 'light' | 'dark', accentColor, externalLibsMode,
plugins }`, persisted under `localStorage["reason-editor-config"]`.

**KaTeX and Mermaid loading.** `externalLibsMode` (`'cdn'` by default, or `'bundled'`)
decides whether they are fetched from a CDN on first use or imported from the package's
own dependencies. Use `'bundled'` for offline/air-gapped hosts. Draw.io is always a
remote embed regardless.

**Shortcuts.** `src/shortcuts` exports the remappable action registry, live bindings
(user overrides persist to `localStorage`) and the `ShortcutOverrides` extension.
`buildExtensions` already includes it; a host assembling its own array must add it or
remapped combos stop working.

**Collaboration.** `@hocuspocus/provider` + the Tiptap collaboration extensions, against
the Hocuspocus server inside the web app (`apps/qwksearch-web/collaboration/server.ts`,
`bun run collab:dev`), which authorizes through `/api/collaboration/*`.

**i18n.** 21 locales in `src/locales/`. Add a key to `en.ts` first, then the others.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| An extension change has no effect | The schema is fixed at mount. Change `rebuildKey`. |
| A feature works in one surface and not another | `editorEngine` differs — Plate is the default, Tiptap-only features (inline comments) need `'tiptap'`. |
| Editor renders unstyled | `react-reason-editor/style.css` was not imported; the package does not inject it. |
| SSR hydration errors | Pass `immediatelyRender={false}` to `NovelEditor`. |
| The editor rebuilds on every parent render | Do not construct a new `EditorSurface`/component identity per render; `NovelEditor` keeps it stable deliberately — mirror that if you wrap it. |
| `ReasonDocs` won't compile without a sidebar | `SidebarComponent` and `SidebarContentComponent` are **required** props. Pass `Sidebar` and `SidebarContent` from `react-reason-editor-sidebar`. |
| `initialDocId` changes are ignored | By design: it applies only on the first render where the document exists, so it never fights the user's tab switching. |
| Sidebar sections are missing | `onGenerateTips` / `onGenerateTopics` / `onSearchTopic` / `onSignIn` are optional, and omitting one hides its section. |
| Closing several tabs at once collapses to one | Implement `onExtraTabsClose` — the fallback issues repeated `onExtraTabClose` calls against pre-close state. |
| KaTeX/Mermaid fail offline | `externalLibsMode: 'cdn'`. Switch to `'bundled'`. |
| Consumers get stale types | `bun run build` runs `vite build`; `build:lib` is the library target and `deploy` also builds the demo. |
