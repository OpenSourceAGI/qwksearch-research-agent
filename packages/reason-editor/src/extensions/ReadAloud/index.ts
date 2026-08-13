/**
 * Entry point for the ReadAloud extension that re-exports the extension and its
 * React components. Lets the app import speaking the document out loud from a
 * single, stable module path.
 */

export * from './ReadAloud';
export * from './components/RichTextReadAloud';
export * from './hooks/useReadAloudState';
