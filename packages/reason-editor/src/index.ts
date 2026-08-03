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
