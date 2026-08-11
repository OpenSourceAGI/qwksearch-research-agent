/**
 * The single import boundary between this package and the `novel` npm package.
 *
 * Novel is the base editor shell: it owns the React tree that creates the
 * Tiptap editor (`EditorRoot` + `EditorContent`), the `cmdk`-backed slash-menu
 * primitives, and the image-upload ProseMirror plugin. Everything schema-level
 * — every node, mark, and command — still comes from this package's own Tiptap
 * extensions under `src/extensions/`, which are handed to Novel through
 * `EditorContent`'s `extensions` prop. See `src/novel/NovelEditor.tsx`.
 *
 * Two things are deliberately kept out of the re-export surface:
 *
 * - Novel's own bundled Tiptap extensions (`StarterKit`, `TiptapImage`,
 *   `TiptapLink`, `Placeholder`, `HighlightExtension`, `Twitter`,
 *   `Mathematics`, `UpdatedImage`, `HorizontalRule`, `TaskList`, …). This
 *   package already ships richer equivalents, and registering both would put
 *   two extensions with the same `name` into one schema.
 * - `getPrevText` / `getAllContent`, which read `editor.storage.markdown`
 *   from `tiptap-markdown` — an extension this editor does not register, so
 *   they would throw. Use `editor.getHTML()` / `editor.getJSON()` instead.
 *
 * ## Tiptap version note
 *
 * `novel@1.0.2` declares Tiptap v2 (`^2.11.2`) in its own dependencies while
 * this package is on Tiptap v3. Two Tiptap copies in one bundle would mean two
 * ProseMirror schemas and two plugin-key counters, so the root `package.json`
 * pins every one of Novel's `@tiptap/*` dependencies to the v3 line via
 * `overrides`. Novel's runtime surface (`EditorProvider`, `useCurrentEditor`,
 * `BubbleMenu`, `ReactRenderer`, `Extension`, `Node`, `Mark`, `@tiptap/pm/*`)
 * is API-compatible across that jump; the one v3 incompatibility is patched at
 * build time by the `novel-tiptap-v3-compat` plugin in `vite.config.ts`.
 */

export {
  // ── Editor shell ──────────────────────────────────────────────────────
  /** Jotai store + tunnel provider that the slash-menu primitives read from. */
  EditorRoot,
  /** Wraps `@tiptap/react`'s `EditorProvider`; publishes `EditorContext`. */
  EditorContent as NovelEditorContent,

  // ── Slash-menu primitives (cmdk) ──────────────────────────────────────
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  /** Tiptap suggestion extension driving the `cmdk` menu above. */
  Command as NovelSlashCommand,
  createSuggestionItems,
  renderItems,
  /**
   * Swallows Arrow/Enter keys while Novel's slash menu is open. No-ops when
   * that menu is not mounted, so it is safe to install unconditionally.
   */
  handleCommandNavigation,

  // ── Image upload ──────────────────────────────────────────────────────
  // Wrapped by `@/plugins/image-upload`, which adapts the single-file
  // `UploadFn` to this package's multi-file signature.
  UploadImagesPlugin,
  createImageUpload,
  handleImagePaste,
  handleImageDrop,

  // ── URL helpers ───────────────────────────────────────────────────────
  isValidUrl,
  getUrlFromString,
} from 'novel';

export type { EditorContentProps, SuggestionItem, UploadFn } from 'novel';
