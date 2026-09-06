/**
 * The always-on core extensions every editor instance needs (document schema,
 * text, paragraph, cursors, list item, text style, placeholder). These are not
 * user-toggleable — they are the substrate the optional plugins build on — so
 * they live outside the plugin registry and are prepended by `buildExtensions`.
 */

import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { ListItem } from '@tiptap/extension-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from '@tiptap/extensions';

import { ShortcutOverrides } from '@/shortcuts';

// Custom document that also permits top-level column layouts.
const DocumentColumn = Document.extend({
  content: '(block|columns)+',
});

export function buildBaseKit(): any[] {
  return [
    DocumentColumn,
    Text,
    Dropcursor.configure({
      class: 'react-reason-editor-theme',
      color: 'var(--richtext-primary)',
      width: 2,
    }),
    Gapcursor,
    HardBreak,
    Paragraph,
    TrailingNode,
    ListItem,
    TextStyle,
    Placeholder.configure({
      placeholder: "Press '/' for commands",
    }),
    // User-remapped toolbar shortcuts (see Settings → Keyboard Shortcuts).
    ShortcutOverrides,
  ];
}
