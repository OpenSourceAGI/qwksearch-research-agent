/**
 * Public package entry point for the editor library, re-exporting the RichTextProvider that hosts the editor. This is the module consumers import when they add reason-editor to their app.
 */

export * from '@/components/RichTextProvider';

/**
 * The Novel-based editor shell. This is the base mount for the editor: Novel's
 * `EditorRoot`/`EditorContent` create the Tiptap instance, while this package's
 * own extensions, toolbar, and bubble menus are layered on top. Hosts render
 * `<NovelEditor extensions={…}>` and place the returned `EditorSurface` in
 * their layout instead of calling `useEditor` themselves.
 */
export {
  NovelEditor,
  useNovelEditor,
  type NovelEditorProps,
  type NovelEditorApi,
  type EditorSurfaceProps,
} from '@/novel/NovelEditor';

/**
 * Full document-organizer app (sidebar, file tree, editor) — the same
 * component the standalone demo mounts. Exported so host apps can embed
 * the whole editor experience directly instead of iframing the hosted demo.
 */
export { default as ReasonDocs } from '@/editor/ReasonDocs';

/**
 * Controls whether heavy third-party libraries (KaTeX, Mermaid) load lazily
 * from a CDN or from this package's own bundled dependencies. See
 * `@/store/externalLibsMode` for details.
 */
export {
  useExternalLibsMode,
  getExternalLibsMode,
  externalLibsModeActions,
  type ExternalLibsMode,
} from '@/store/externalLibsMode';
