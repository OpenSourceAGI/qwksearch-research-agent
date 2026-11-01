# react-reason-editor API Reference

Package name **`react-reason-editor`**; directory `packages/reason-editor`.

## Subpath exports

| Subpath | Contents |
| --- | --- |
| `.` | `RichTextProvider`, `NovelEditor`/`useNovelEditor`, `ReasonDocs`, the external-libs store |
| `./editor-kit` | Headless building blocks for a host-owned document lifecycle |
| `./reason-docs` | `ReasonDocs` + its split-pane CSS |
| `./docs-agent` | `ReasonTiptapEditor`, `ReasonPlateEditor`, `ReasonPlaygroundEditor` |
| `./bubble` | Bubble menus |
| `./theme` | Theme tokens |
| `./locale-bundle` | All locales and helpers |
| `./style.css` | The stylesheet (must be imported explicitly) |
| `./<extension>` | One extension each — see the list below |
| `./dist/*`, `./*` | Escape hatches into the built output |

## `NovelEditor`

```tsx
<NovelEditor {...props}>{({ editor, EditorSurface }) => ReactNode}</NovelEditor>
```

`children` is a **render prop** receiving `NovelEditorApi` — `editor: Editor | null`
(null on the first render) and `EditorSurface`, which must be rendered exactly once.

| Prop | Notes |
| --- | --- |
| `extensions` | **Required.** The complete Tiptap extension array — Novel's own are not merged in |
| `initialContent` | HTML string or Tiptap JSON |
| `rebuildKey` | Remount token; change it whenever `extensions` changes |
| `editable` | |
| `editorProps` | Merged over Novel's command-navigation keydown handler |
| `className` | Outer wrapper that scopes the stylesheet |
| `onCreate`, `onUpdate`, `onSelectionUpdate` | Tiptap `EditorEvents` |
| `immediatelyRender` | Set `false` under SSR |
| `textDirection` | `'auto'` enables per-block detection |
| `onEditor` | Fires from an effect with the live editor (and `null` on teardown) |

`RichTextProvider({ editor, children, dark? })` is the older form for hosts that build
their own `useEditor` instance.

## `editor-kit`

`RichTextProvider` · `RichTextToolbar` · `BubbleMenus` · `debounce` ·
`NovelEditor` / `useNovelEditor` / `NovelEditorProps` / `NovelEditorApi` /
`EditorSurfaceProps` · `buildExtensions(config)` · `createDefaultConfig()` ·
`EditorConfig` · `useExternalLibsMode` / `getExternalLibsMode` /
`externalLibsModeActions` / `ExternalLibsMode` · `export * from './shortcuts'`.

### `EditorConfig`

| Field | Values | Notes |
| --- | --- | --- |
| `language` | a locale key | 21 available |
| `theme` | `'light'` \| `'dark'` | |
| `accentColor` | `ThemeColorType` | Accent preset |
| `externalLibsMode` | `'cdn'` (default) \| `'bundled'` | KaTeX and Mermaid loading; Draw.io is always remote |
| `plugins` | `Record<string, PluginConfigEntry>` | Derived from `PLUGIN_REGISTRY` by `createDefaultConfig()` |

Persisted under `localStorage["reason-editor-config"]` (`CONFIG_STORAGE_KEY`).

## `ReasonDocs`

| Prop | Required | Notes |
| --- | --- | --- |
| `SidebarComponent` | ✔ | `Sidebar` from `react-reason-editor-sidebar` |
| `SidebarContentComponent` | ✔ | `SidebarContent` from the same package |
| `editorEngine` | | `'plate'` (default) or `'tiptap'` |
| `mainContent`, `belowMainContent` | | Host content in the main column |
| `openFilesSidebarSignal` | | Change the value to open the files sidebar from outside |
| `extraTabs`, `activeExtraTabId`, `onExtraTabSelect`, `onExtraTabClose`, `onExtraTabsClose`, `onExtraTabAdd`, `onFileTabSelect` | | Host-owned non-document tabs. Implement `onExtraTabsClose` for batch closes |
| `initialDocId`, `onActiveDocumentChange` | | `initialDocId` applies once, on the first render where the document exists |
| `onGenerateTips`, `onGenerateTopics`, `onSearchTopic`, `onSignIn` | | Omitting one hides its sidebar section |

## Extensions (59, `src/extensions/`)

`Ai` `Attachment` `Blockquote` `Bold` `BulletList` `Callout` `Clear` `Code` `CodeBlock`
`CodeView` `Color` `Column` `Comment` `Drawer` `Drawio` `Emoji` `ExportPdf` `ExportWord`
`FontFamily` `FontSize` `Harper` `Heading` `Highlight` `History` `HorizontalRule`
`Iframe` `Image` `ImageGif` `ImportWord` `Indent` `Italic` `Katex` `LineHeight` `Link`
`MarkdownPaste` `Mention` `Mermaid` `MoreMark` `OfficePaste` `OrderedList` `Pagination`
`ReadAloud` `SearchAndReplace` `SelectSimilar` `SlashCommand` `Strike` `Subscript`
`Superscript` `Table` `TableOfContents` `TaskList` `TextAlign` `TextDirection`
`TextUnderline` `Transcribe` `Twitter` `Video` `WordCount` `Zoom`.

Most have a lowercase subpath export (`react-reason-editor/table`,
`/searchandreplace`, `/slashcommand`, …). New extensions need an entry in
`package.json`'s `exports` to be importable standalone.

## Shortcuts

`src/shortcuts` → the remappable action registry, live bindings (user overrides in
`localStorage`), and `ShortcutOverrides` / `handleShortcutKeyDown`. `buildExtensions`
includes `ShortcutOverrides`; hand-assembled extension arrays must add it.

## Locales (`src/locales/`, 21)

`ar` `de` `en` `es` `fa` `fi` `fr` `he` `hi` `hu` `it` `ja` `ko` `nl` `pt-br` `ru` `tr`
`uk` `vi` `zh-cn` (+ `index.ts`).

## Scripts

`dev` (demo via `demo/vite.config.ts`) · `build` / `build:lib` / `build:demo` ·
`dev:worker` / `preview` / `deploy` (wrangler) · `test` / `test:coverage`.
