/**
 * Entry point for the TableOfContents extension that re-exports the extension and its React components. Lets the app import an automatic table of contents from a single, stable module path.
 */

export { TableOfContents, type TableOfContentsOptions, type TocItem } from './TableOfContents';
export { RichTextTableOfContents } from './components/RichTextTableOfContents';
export { RichTextTableOfContentsPanel } from './components/RichTextTableOfContentsPanel';
