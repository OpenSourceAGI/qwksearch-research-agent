/**
 * Entry point for the Comment extension that re-exports the extension and its React components. Lets the app import inline comments and annotations from a single, stable module path.
 */

export * from './Comment';
export { CommentView, CommentPanel } from './components/CommentView';
