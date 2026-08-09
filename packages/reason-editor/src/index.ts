/**
 * Public package entry point for the editor library, re-exporting the RichTextProvider that hosts the editor. This is the module consumers import when they add reason-editor to their app.
 */

export * from '@/components/RichTextProvider';

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
