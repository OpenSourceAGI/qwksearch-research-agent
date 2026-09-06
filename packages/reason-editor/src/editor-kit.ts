/**
 * Headless building blocks for embedding a full-featured reason-editor
 * surface (toolbar, bubble menus, default extension set) in a host that
 * owns its own single-document load/save lifecycle instead of the
 * ReasonDocs app shell's own document store — e.g. a VS Code custom
 * editor backed by a real file on disk. Mirrors what the demo's
 * `TabEditorOnly` composes from internal `src/` paths, but as a stable
 * public subpath (`react-reason-editor/editor-kit`) any consumer of the
 * published package can import.
 */

export { RichTextProvider } from './components/RichTextProvider';
export { RichTextToolbar, BubbleMenus, debounce } from './editor-views/components';
/**
 * The Novel-based editor shell. `NovelEditor` mounts the editor (Novel's
 * `EditorRoot`/`EditorContent`) and hands back the live editor plus an
 * `EditorSurface` component to place in the host's own layout, so hosts no
 * longer call `useEditor` themselves. `RichTextProvider` above remains for
 * hosts that still construct their own editor instance.
 */
export {
  NovelEditor,
  useNovelEditor,
  type NovelEditorProps,
  type NovelEditorApi,
  type EditorSurfaceProps,
} from './novel/NovelEditor';
export {
  buildExtensions,
  createDefaultConfig,
  type EditorConfig,
} from './editor-views/config/editorConfig';
export {
  useExternalLibsMode,
  getExternalLibsMode,
  externalLibsModeActions,
  type ExternalLibsMode,
} from './store/externalLibsMode';
/**
 * Keyboard-shortcut registry: the remappable toolbar actions, their live
 * bindings (user overrides persist to localStorage), and the ShortcutOverrides
 * Tiptap extension that makes remapped combos work. `buildExtensions` already
 * includes the extension; hosts composing their own extension array should add
 * `ShortcutOverrides` themselves.
 */
export * from './shortcuts';
