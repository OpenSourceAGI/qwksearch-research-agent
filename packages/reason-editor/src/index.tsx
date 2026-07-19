/**
 * reason-editor - Rich Text Editor with toolbar for formatting, media, tables
 *
 * Built on Lexical (Meta's extensible text editor framework).
 * Provides a full-featured editor with collaboration support, markdown shortcuts,
 * images, tables, equations, code blocks, and 40+ plugins.
 *
 * @example
 * ```tsx
 * import Editor from 'reason-editor';
 * import 'reason-editor/style.css';
 *
 * function App() {
 *   return <Editor />;
 * }
 * ```
 */

// Main editor component (default export)
export { default, EditorWithToolbar, EditorContent } from './lexical/index';

// Full app layout with sidebar (ReasonDocs)
export { default as ReasonDocs } from './editors/ReasonDocs';

// Node registry and theme
export { default as PlaygroundNodes } from './lexical/nodes/PlaygroundNodes';
export { default as PlaygroundEditorTheme } from './lexical/themes/PlaygroundEditorTheme';

// Context providers
export { SettingsContext, useSettings } from './lexical/context/SettingsContext';
export {
  SharedHistoryContext,
  useSharedHistoryContext,
} from './lexical/context/SharedHistoryContext';
export { FlashMessageContext } from './lexical/context/FlashMessageContext';
export { ToolbarContext } from './lexical/context/ToolbarContext';

// Table context
export { TableContext } from './lexical/plugins/TablePlugin';

// Utilities
export { buildHTMLConfig } from './lexical/utils/buildHTMLConfig';
export { default as Icon, getIconSrc } from './lexical/ui/Icon';

// Re-export collaboration helpers
export {
  createWebsocketProvider,
  createWebsocketProviderWithDoc,
} from './lexical/collab/collaboration';
