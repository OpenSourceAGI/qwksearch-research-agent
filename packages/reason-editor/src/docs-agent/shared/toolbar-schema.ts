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
 *
 * Every entry also carries what its tooltip shows: a one-line `description` and
 * the keyboard `shortcut`. Shortcuts are only declared where the editor really
 * binds the combo — where the two engines disagree (strikethrough, blockquote,
 * code block…) the entry spells out each engine's binding, and `null` marks an
 * engine with none. The Plate playground toolbar looks its buttons up here by id
 * (`getToolbarMeta`), so its tooltips come from the same data.
 */

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  Code,
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
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  Trash2,
  Type,
  Underline,
  Undo2,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ToolbarCommand } from './editor-types';
import type { ToolbarShortcut } from './toolbar-shortcuts';

export type { ToolbarShortcut } from './toolbar-shortcuts';

/** What a toolbar tooltip needs to know about a control. */
export interface ToolbarMeta {
  label: string;
  /** One line: what pressing the control does. */
  description: string;
  shortcut?: ToolbarShortcut;
}

export type ToolbarItem =
  | {
      kind: 'button';
      id: ToolbarCommand;
      label: string;
      description: string;
      icon: LucideIcon;
      shortcut?: ToolbarShortcut;
    }
  | {
      kind: 'menu';
      id: string;
      label: string;
      description: string;
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
  {
    kind: 'button',
    id: 'undo',
    label: 'Undo',
    description: 'Reverse your last change.',
    icon: Undo2,
    shortcut: 'mod+z',
  },
  {
    kind: 'button',
    id: 'redo',
    label: 'Redo',
    description: 'Bring back the change you just undid.',
    icon: Redo2,
    shortcut: 'mod+shift+z',
  },
  { kind: 'separator', id: 'history-divider' },

  {
    kind: 'button',
    id: 'bold',
    label: 'Bold',
    description: 'Make the selected text bold.',
    icon: Bold,
    shortcut: 'mod+b',
  },
  {
    kind: 'button',
    id: 'italic',
    label: 'Italic',
    description: 'Slant the selected text.',
    icon: Italic,
    shortcut: 'mod+i',
  },
  {
    kind: 'button',
    id: 'underline',
    label: 'Underline',
    description: 'Underline the selected text.',
    icon: Underline,
    shortcut: 'mod+u',
  },
  {
    kind: 'button',
    id: 'highlight',
    label: 'Highlight',
    description: 'Mark the selected text with a highlighter.',
    icon: Highlighter,
    shortcut: 'mod+shift+h',
  },
  { kind: 'separator', id: 'marks-divider' },

  {
    kind: 'menu',
    id: 'block-format',
    label: 'Block Format',
    description: 'Turn the current block into a heading, list, quote or code block.',
    icon: Rows3,
    children: [
      {
        kind: 'button',
        id: 'paragraph',
        label: 'Paragraph',
        description: 'Turn the block into normal body text.',
        icon: Pilcrow,
        shortcut: 'mod+alt+0',
      },
      {
        kind: 'button',
        id: 'heading-1',
        label: 'Heading 1',
        description: 'Largest section heading.',
        icon: Heading1,
        shortcut: 'mod+alt+1',
      },
      {
        kind: 'button',
        id: 'heading-2',
        label: 'Heading 2',
        description: 'Large section heading.',
        icon: Heading2,
        shortcut: 'mod+alt+2',
      },
      {
        kind: 'button',
        id: 'heading-3',
        label: 'Heading 3',
        description: 'Medium section heading.',
        icon: Heading3,
        shortcut: 'mod+alt+3',
      },
      {
        kind: 'button',
        id: 'heading-4',
        label: 'Heading 4',
        description: 'Small section heading.',
        icon: Heading4,
        shortcut: 'mod+alt+4',
      },
      {
        kind: 'button',
        id: 'heading-5',
        label: 'Heading 5',
        description: 'Smaller section heading.',
        icon: Heading5,
        shortcut: 'mod+alt+5',
      },
      {
        kind: 'button',
        id: 'heading-6',
        label: 'Heading 6',
        description: 'Smallest section heading.',
        icon: Heading6,
        shortcut: 'mod+alt+6',
      },
      { kind: 'separator', id: 'block-format-lists-divider' },
      {
        kind: 'button',
        id: 'bullet-list',
        label: 'Bullet List',
        description: 'Start or stop a bulleted list.',
        icon: List,
        shortcut: 'mod+shift+8',
      },
      {
        kind: 'button',
        id: 'ordered-list',
        label: 'Ordered List',
        description: 'Start or stop a numbered list.',
        icon: ListOrdered,
        shortcut: 'mod+shift+7',
      },
      {
        kind: 'button',
        id: 'task-list',
        label: 'Check List',
        description: 'Start or stop a to-do list with checkboxes.',
        icon: ListChecks,
        shortcut: { tiptap: 'mod+shift+9', plate: null },
      },
      { kind: 'separator', id: 'block-format-quote-divider' },
      {
        kind: 'button',
        id: 'blockquote',
        label: 'Blockquote',
        description: 'Set the block apart as a quotation.',
        icon: Quote,
        shortcut: { tiptap: 'mod+shift+b', plate: 'mod+shift+.' },
      },
      {
        kind: 'button',
        id: 'code-block',
        label: 'Code Block',
        description: 'Format the block as monospaced code.',
        icon: SquareCode,
        shortcut: { tiptap: 'mod+alt+c', plate: 'mod+alt+8' },
      },
      { kind: 'separator', id: 'block-format-clear-divider' },
      {
        kind: 'button',
        id: 'clear-formatting',
        label: 'Clear Format',
        description: 'Remove all formatting from the selection.',
        icon: Eraser,
        shortcut: 'mod+\\',
      },
    ],
  },

  {
    kind: 'menu',
    id: 'text-styles',
    label: 'Text Styles',
    description: 'More text formatting: strikethrough, code, colour, scripts, indent and alignment.',
    icon: Type,
    children: [
      { kind: 'group-label', id: 'text-styles-label', label: 'Text Styles' },
      {
        kind: 'button',
        id: 'strike',
        label: 'Strikethrough',
        description: 'Draw a line through the selected text.',
        icon: Strikethrough,
        shortcut: { tiptap: 'mod+shift+s', plate: 'mod+shift+x' },
      },
      {
        kind: 'button',
        id: 'code',
        label: 'Inline Code',
        description: 'Format the selection as inline code.',
        icon: Code,
        shortcut: 'mod+e',
      },
      {
        kind: 'button',
        id: 'text-color',
        label: 'Text Color',
        description: 'Change the colour of the selected text.',
        icon: Baseline,
        shortcut: { tiptap: 'alt+shift+c', plate: null },
      },
      {
        kind: 'button',
        id: 'superscript',
        label: 'Superscript',
        description: 'Raise the selected text above the line.',
        icon: Superscript,
        shortcut: 'mod+.',
      },
      {
        kind: 'button',
        id: 'subscript',
        label: 'Subscript',
        description: 'Lower the selected text below the line.',
        icon: Subscript,
        shortcut: 'mod+,',
      },
      { kind: 'separator', id: 'text-styles-indent-divider' },
      {
        kind: 'button',
        id: 'indent',
        label: 'Indent',
        description: 'Move the block one level to the right.',
        icon: IndentIncrease,
        shortcut: 'tab',
      },
      {
        kind: 'button',
        id: 'outdent',
        label: 'Outdent',
        description: 'Move the block one level to the left.',
        icon: IndentDecrease,
        shortcut: 'shift+tab',
      },
      {
        kind: 'menu',
        id: 'alignment',
        label: 'Alignment',
        description: 'Align the block to the left, centre, right or justify it.',
        icon: AlignLeft,
        children: [
          {
            kind: 'button',
            id: 'align-left',
            label: 'Align Left',
            description: 'Line the text up with the left margin.',
            icon: AlignLeft,
            shortcut: 'mod+shift+l',
          },
          {
            kind: 'button',
            id: 'align-center',
            label: 'Align Center',
            description: 'Centre the text between the margins.',
            icon: AlignCenter,
            shortcut: 'mod+shift+e',
          },
          {
            kind: 'button',
            id: 'align-right',
            label: 'Align Right',
            description: 'Line the text up with the right margin.',
            icon: AlignRight,
            shortcut: 'mod+shift+r',
          },
          {
            kind: 'button',
            id: 'align-justify',
            label: 'Justify',
            description: 'Stretch lines to fill the full width.',
            icon: AlignJustify,
            shortcut: 'mod+shift+j',
          },
        ],
      },
    ],
  },

  {
    kind: 'menu',
    id: 'insert',
    label: 'Insert',
    description: 'Add a link, table, image, callout, divider, video or equation.',
    icon: Plus,
    children: [
      { kind: 'group-label', id: 'insert-label', label: 'Insert' },
      {
        kind: 'button',
        id: 'link',
        label: 'Link',
        description: 'Turn the selection into a link.',
        icon: Link2,
        shortcut: { tiptap: null, plate: 'mod+k' },
      },
      {
        kind: 'button',
        id: 'emoji',
        label: 'Emoji',
        description: 'Pick an emoji to insert.',
        icon: Smile,
      },
      {
        kind: 'button',
        id: 'table',
        label: 'Table',
        description: 'Insert a table.',
        icon: Table2,
      },
      {
        kind: 'button',
        id: 'image',
        label: 'Image',
        description: 'Insert an image from a file or URL.',
        icon: ImageIcon,
      },
      {
        kind: 'button',
        id: 'columns',
        label: 'Columns',
        description: 'Lay content out in side-by-side columns.',
        icon: Columns2,
        shortcut: { tiptap: 'mod+alt+g', plate: null },
      },
      {
        kind: 'button',
        id: 'callout',
        label: 'Callout',
        description: 'Highlight a note in a tinted box.',
        icon: Info,
      },
      {
        kind: 'button',
        id: 'horizontal-rule',
        label: 'Divider',
        description: 'Insert a horizontal dividing line.',
        icon: Minus,
        shortcut: { tiptap: 'mod+alt+s', plate: null },
      },
      {
        kind: 'button',
        id: 'video',
        label: 'Video',
        description: 'Embed a video.',
        icon: Video,
      },
      {
        kind: 'button',
        id: 'math',
        label: 'Math',
        description: 'Insert a mathematical equation.',
        icon: Sigma,
      },
    ],
  },

  { kind: 'separator', id: 'voice-divider' },
  {
    kind: 'button',
    id: 'transcribe',
    label: 'Dictate',
    description: 'Type by speaking; say commands to format as you go.',
    icon: Mic,
    shortcut: { tiptap: 'mod+shift+d', plate: null },
  },

  {
    kind: 'menu',
    id: 'table-tools',
    label: 'Table',
    description: 'Edit the rows, columns and cells of the current table.',
    icon: Table2,
    visibleWhenActive: 'table',
    children: [
      { kind: 'group-label', id: 'table-rows-label', label: 'Rows' },
      {
        kind: 'button',
        id: 'table.add-row-before',
        label: 'Insert Row Above',
        description: 'Add a row above the current one.',
        icon: BetweenHorizontalStart,
      },
      {
        kind: 'button',
        id: 'table.add-row-after',
        label: 'Insert Row Below',
        description: 'Add a row below the current one.',
        icon: BetweenHorizontalEnd,
      },
      {
        kind: 'button',
        id: 'table.delete-row',
        label: 'Delete Row',
        description: 'Remove the current row.',
        icon: Trash2,
      },
      { kind: 'separator', id: 'table-columns-divider' },
      { kind: 'group-label', id: 'table-columns-label', label: 'Columns' },
      {
        kind: 'button',
        id: 'table.add-column-before',
        label: 'Insert Column Left',
        description: 'Add a column to the left of the current one.',
        icon: BetweenVerticalStart,
      },
      {
        kind: 'button',
        id: 'table.add-column-after',
        label: 'Insert Column Right',
        description: 'Add a column to the right of the current one.',
        icon: BetweenVerticalEnd,
      },
      {
        kind: 'button',
        id: 'table.delete-column',
        label: 'Delete Column',
        description: 'Remove the current column.',
        icon: Trash2,
      },
      { kind: 'separator', id: 'table-cells-divider' },
      { kind: 'group-label', id: 'table-cells-label', label: 'Cells' },
      {
        kind: 'button',
        id: 'table.merge-cells',
        label: 'Merge Cells',
        description: 'Combine the selected cells into one.',
        icon: TableCellsMerge,
      },
      {
        kind: 'button',
        id: 'table.split-cell',
        label: 'Split Cell',
        description: 'Split a merged cell back into separate cells.',
        icon: TableCellsSplit,
      },
      {
        kind: 'button',
        id: 'table.toggle-header-row',
        label: 'Toggle Header Row',
        description: 'Turn the first row into a header, or back.',
        icon: TableProperties,
      },
      { kind: 'separator', id: 'table-delete-divider' },
      {
        kind: 'button',
        id: 'table.delete',
        label: 'Delete Table',
        description: 'Remove the whole table.',
        icon: Trash2,
      },
    ],
  },
];

/**
 * Controls only the Plate playground toolbar has — they have no engine-neutral
 * command, so they are not part of `REASON_TOOLBAR`, but their tooltips still
 * come from here rather than from string literals in the components.
 */
export const PLAYGROUND_TOOLBAR_META = {
  'turn-into': {
    label: 'Turn into',
    description: 'Change the current block into another type.',
  },
  'font-size': {
    label: 'Font size',
    description: 'Set the size of the selected text.',
  },
  'font-size-decrease': {
    label: 'Decrease font size',
    description: 'Make the selected text one size smaller.',
  },
  'font-size-increase': {
    label: 'Increase font size',
    description: 'Make the selected text one size larger.',
  },
  'background-color': {
    label: 'Background Color',
    description: 'Fill the background behind the selected text.',
  },
  'text-styles-more': {
    label: 'More',
    description: 'Superscript, subscript, keyboard input and clear formatting.',
  },
  'toggle-list': {
    label: 'Toggle',
    description: 'Insert a collapsible block that hides its contents.',
  },
  'line-height': {
    label: 'Line height',
    description: 'Set the spacing between lines of text.',
  },
  audio: {
    label: 'Audio',
    description: 'Insert an audio clip.',
  },
  file: {
    label: 'File',
    description: 'Attach a file to the document.',
  },
  import: {
    label: 'Import',
    description: 'Bring in content from a file.',
  },
  export: {
    label: 'Export',
    description: 'Download the document in another format.',
  },
  'inline-equation': {
    label: 'Equation',
    description: 'Turn the selection into an inline equation.',
  },
  'ask-ai': {
    label: 'Ask AI',
    description: 'Ask the writing assistant to edit or draft text.',
    shortcut: 'mod+j',
  },
} satisfies Record<string, ToolbarMeta>;

export type PlaygroundToolbarId = keyof typeof PLAYGROUND_TOOLBAR_META;

function indexSchema(items: ToolbarItem[], into: Map<string, ToolbarMeta>) {
  for (const item of items) {
    if (item.kind === 'button' || item.kind === 'menu') {
      into.set(item.id, {
        label: item.label,
        description: item.description,
        shortcut: item.kind === 'button' ? item.shortcut : undefined,
      });
    }
    if (item.kind === 'menu') indexSchema(item.children, into);
  }
}

let metaIndex: Map<string, ToolbarMeta> | undefined;

/**
 * Tooltip data for a control, by schema id (`bold`, `bullet-list`, …) or by one
 * of the playground-only ids above.
 */
export function getToolbarMeta(id: string): ToolbarMeta | undefined {
  if (!metaIndex) {
    metaIndex = new Map();
    indexSchema(REASON_TOOLBAR, metaIndex);
    for (const [key, meta] of Object.entries(PLAYGROUND_TOOLBAR_META)) {
      metaIndex.set(key, meta);
    }
  }

  return metaIndex.get(id);
}

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
