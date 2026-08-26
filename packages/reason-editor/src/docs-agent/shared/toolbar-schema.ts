/**
 * The Reason Editor toolbar, declared once and rendered identically by both
 * engines.
 *
 * The arrangement mirrors `editor-views/components/Toolbar.tsx`: history, the
 * direct inline marks, the Block Format menu, the Text Styles overflow menu, the
 * Insert menu, the Dictate toggle (the voice-commands plugin, ported from
 * `src/extensions/Transcribe`), and the contextual Table menu. Changing the
 * product's toolbar means editing this file — not the Tiptap or Plate
 * components.
 */

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Braces,
  Code,
  Code2,
  Columns2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Info,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Mic,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Rows3,
  Sigma,
  Smile,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ToolbarCommand } from './editor-types';

export type ToolbarItem =
  | {
      kind: 'button';
      id: ToolbarCommand;
      label: string;
      icon: LucideIcon;
      shortcut?: string;
    }
  | {
      kind: 'menu';
      id: string;
      label: string;
      icon: LucideIcon;
      children: ToolbarItem[];
      /**
       * Only render this menu while the adapter reports the command as active —
       * used for the contextual table menu.
       */
      visibleWhenActive?: ToolbarCommand;
    }
  | { kind: 'separator'; id: string }
  | { kind: 'group-label'; id: string; label: string };

export const REASON_TOOLBAR: ToolbarItem[] = [
  { kind: 'button', id: 'undo', label: 'Undo', icon: Undo2, shortcut: '⌘Z' },
  { kind: 'button', id: 'redo', label: 'Redo', icon: Redo2, shortcut: '⇧⌘Z' },
  { kind: 'separator', id: 'history-divider' },

  { kind: 'button', id: 'bold', label: 'Bold', icon: Bold, shortcut: '⌘B' },
  { kind: 'button', id: 'italic', label: 'Italic', icon: Italic, shortcut: '⌘I' },
  {
    kind: 'button',
    id: 'underline',
    label: 'Underline',
    icon: Underline,
    shortcut: '⌘U',
  },
  {
    kind: 'button',
    id: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    shortcut: '⌘⇧H',
  },
  { kind: 'separator', id: 'marks-divider' },

  {
    kind: 'menu',
    id: 'block-format',
    label: 'Block Format',
    icon: Rows3,
    children: [
      { kind: 'button', id: 'paragraph', label: 'Paragraph', icon: Pilcrow },
      {
        kind: 'button',
        id: 'heading-1',
        label: 'Heading 1',
        icon: Heading1,
        shortcut: 'Ctrl+Alt+1',
      },
      {
        kind: 'button',
        id: 'heading-2',
        label: 'Heading 2',
        icon: Heading2,
        shortcut: 'Ctrl+Alt+2',
      },
      {
        kind: 'button',
        id: 'heading-3',
        label: 'Heading 3',
        icon: Heading3,
        shortcut: 'Ctrl+Alt+3',
      },
      {
        kind: 'button',
        id: 'heading-4',
        label: 'Heading 4',
        icon: Heading4,
        shortcut: 'Ctrl+Alt+4',
      },
      {
        kind: 'button',
        id: 'heading-5',
        label: 'Heading 5',
        icon: Heading5,
        shortcut: 'Ctrl+Alt+5',
      },
      {
        kind: 'button',
        id: 'heading-6',
        label: 'Heading 6',
        icon: Heading6,
        shortcut: 'Ctrl+Alt+6',
      },
      { kind: 'separator', id: 'block-format-lists-divider' },
      {
        kind: 'button',
        id: 'bullet-list',
        label: 'Bullet List',
        icon: List,
        shortcut: 'Ctrl+Shift+8',
      },
      {
        kind: 'button',
        id: 'ordered-list',
        label: 'Ordered List',
        icon: ListOrdered,
        shortcut: 'Ctrl+Shift+7',
      },
      {
        kind: 'button',
        id: 'task-list',
        label: 'Check List',
        icon: ListChecks,
        shortcut: 'Ctrl+Shift+9',
      },
      { kind: 'separator', id: 'block-format-quote-divider' },
      {
        kind: 'button',
        id: 'blockquote',
        label: 'Blockquote',
        icon: Quote,
        shortcut: 'Ctrl+Shift+B',
      },
      {
        kind: 'button',
        id: 'code-block',
        label: 'Code Block',
        icon: Code2,
        shortcut: 'Ctrl+Alt+C',
      },
      { kind: 'separator', id: 'block-format-clear-divider' },
      {
        kind: 'button',
        id: 'clear-formatting',
        label: 'Clear Format',
        icon: Eraser,
      },
    ],
  },

  {
    kind: 'menu',
    id: 'text-styles',
    label: 'Text Styles',
    icon: Type,
    children: [
      { kind: 'group-label', id: 'text-styles-label', label: 'Text Styles' },
      {
        kind: 'button',
        id: 'strike',
        label: 'Strikethrough',
        icon: Strikethrough,
        shortcut: 'Ctrl+Shift+S',
      },
      {
        kind: 'button',
        id: 'code',
        label: 'Inline Code',
        icon: Code,
        shortcut: 'Ctrl+E',
      },
      {
        kind: 'button',
        id: 'text-color',
        label: 'Text Color',
        icon: Baseline,
        shortcut: 'Alt+Shift+C',
      },
      {
        kind: 'button',
        id: 'superscript',
        label: 'Superscript',
        icon: Superscript,
        shortcut: 'Ctrl+.',
      },
      {
        kind: 'button',
        id: 'subscript',
        label: 'Subscript',
        icon: Subscript,
        shortcut: 'Ctrl+,',
      },
      { kind: 'separator', id: 'text-styles-indent-divider' },
      { kind: 'button', id: 'indent', label: 'Indent', icon: IndentIncrease },
      { kind: 'button', id: 'outdent', label: 'Outdent', icon: IndentDecrease },
      {
        kind: 'menu',
        id: 'alignment',
        label: 'Alignment',
        icon: AlignLeft,
        children: [
          { kind: 'button', id: 'align-left', label: 'Align Left', icon: AlignLeft },
          {
            kind: 'button',
            id: 'align-center',
            label: 'Align Center',
            icon: AlignCenter,
          },
          {
            kind: 'button',
            id: 'align-right',
            label: 'Align Right',
            icon: AlignRight,
          },
          {
            kind: 'button',
            id: 'align-justify',
            label: 'Justify',
            icon: AlignJustify,
          },
        ],
      },
    ],
  },

  {
    kind: 'menu',
    id: 'insert',
    label: 'Insert',
    icon: Plus,
    children: [
      { kind: 'group-label', id: 'insert-label', label: 'Insert' },
      { kind: 'button', id: 'link', label: 'Link', icon: Link2 },
      { kind: 'button', id: 'emoji', label: 'Emoji', icon: Smile },
      { kind: 'button', id: 'table', label: 'Table', icon: Table2 },
      { kind: 'button', id: 'image', label: 'Image', icon: ImageIcon },
      {
        kind: 'button',
        id: 'columns',
        label: 'Columns',
        icon: Columns2,
        shortcut: 'Ctrl+Alt+G',
      },
      { kind: 'button', id: 'callout', label: 'Callout', icon: Info },
      {
        kind: 'button',
        id: 'horizontal-rule',
        label: 'Divider',
        icon: Minus,
        shortcut: 'Ctrl+Alt+S',
      },
      { kind: 'button', id: 'video', label: 'Video', icon: Video },
      { kind: 'button', id: 'math', label: 'Math', icon: Sigma },
    ],
  },

  { kind: 'separator', id: 'voice-divider' },
  {
    kind: 'button',
    id: 'transcribe',
    label: 'Dictate',
    icon: Mic,
    shortcut: 'Ctrl+Shift+D',
  },

  {
    kind: 'menu',
    id: 'table-tools',
    label: 'Table',
    icon: Table2,
    visibleWhenActive: 'table',
    children: [
      { kind: 'group-label', id: 'table-rows-label', label: 'Rows' },
      {
        kind: 'button',
        id: 'table.add-row-before',
        label: 'Insert Row Above',
        icon: Rows3,
      },
      {
        kind: 'button',
        id: 'table.add-row-after',
        label: 'Insert Row Below',
        icon: Rows3,
      },
      {
        kind: 'button',
        id: 'table.delete-row',
        label: 'Delete Row',
        icon: Trash2,
      },
      { kind: 'separator', id: 'table-columns-divider' },
      { kind: 'group-label', id: 'table-columns-label', label: 'Columns' },
      {
        kind: 'button',
        id: 'table.add-column-before',
        label: 'Insert Column Left',
        icon: Columns2,
      },
      {
        kind: 'button',
        id: 'table.add-column-after',
        label: 'Insert Column Right',
        icon: Columns2,
      },
      {
        kind: 'button',
        id: 'table.delete-column',
        label: 'Delete Column',
        icon: Trash2,
      },
      { kind: 'separator', id: 'table-cells-divider' },
      { kind: 'group-label', id: 'table-cells-label', label: 'Cells' },
      {
        kind: 'button',
        id: 'table.merge-cells',
        label: 'Merge Cells',
        icon: Braces,
      },
      {
        kind: 'button',
        id: 'table.split-cell',
        label: 'Split Cell',
        icon: Braces,
      },
      {
        kind: 'button',
        id: 'table.toggle-header-row',
        label: 'Toggle Header Row',
        icon: Rows3,
      },
      { kind: 'separator', id: 'table-delete-divider' },
      {
        kind: 'button',
        id: 'table.delete',
        label: 'Delete Table',
        icon: Trash2,
      },
    ],
  },
];

/** Every command the schema references, in render order (depth-first). */
export function collectToolbarCommands(
  items: ToolbarItem[] = REASON_TOOLBAR,
): ToolbarCommand[] {
  const out: ToolbarCommand[] = [];

  for (const item of items) {
    if (item.kind === 'button') out.push(item.id);
    if (item.kind === 'menu') out.push(...collectToolbarCommands(item.children));
  }

  return out;
}
