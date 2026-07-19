/**
 * Lightweight article reader/viewer built on Lexical.
 * Renders HTML content in a read-only Lexical editor with optional highlighting.
 *
 * @example
 * ```tsx
 * import LexicalArticleViewer from 'reason-editor/reader';
 *
 * function App() {
 *   return <LexicalArticleViewer html="<p>Hello</p>" isHighlightMode={false} />;
 * }
 * ```
 */
export { default, TOGGLE_HIGHLIGHT_COMMAND } from './alternatives/LexicalArticleViewer';
