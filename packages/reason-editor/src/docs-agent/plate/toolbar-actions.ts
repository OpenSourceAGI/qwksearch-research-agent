/**
 * Plate implementations of the shared toolbar commands.
 *
 * All version-specific Plate surface — node keys, `editor.tf.*` transforms,
 * plugin transforms — is confined to this file, exactly as the ProseMirror
 * chains are confined to `../tiptap/toolbar-actions.ts`. The shared toolbar
 * never sees any of it.
 */

import { TextAlignPlugin } from '@platejs/basic-styles/react';
import { insertCallout } from '@platejs/callout';
import { toggleCodeBlock } from '@platejs/code-block';
import { indent, outdent } from '@platejs/indent';
import { insertColumnGroup } from '@platejs/layout';
import { upsertLink } from '@platejs/link';
import { triggerFloatingLink } from '@platejs/link/react';
import { ListStyleType, someList, someTodoList, toggleList } from '@platejs/list';
import { insertEquation } from '@platejs/math';
import { insertImage, insertMedia } from '@platejs/media';
import {
  deleteColumn,
  deleteRow,
  deleteTable,
  getColSpan,
  getRowSpan,
  getSelectedCellEntries,
  getSelectedCellsBoundingBox,
  getTableAbove,
  insertTable,
  insertTableColumn,
  insertTableRow,
  mergeTableCells,
  splitTableCell,
} from '@platejs/table';
import { KEYS } from 'platejs';
import type { PlateEditor } from 'platejs/react';

import type { ToolbarCommand, ToolbarCommandPayload } from '../shared/editor-types';

/** Shared toolbar command → Plate mark key. */
const MARK_BY_COMMAND: Partial<Record<ToolbarCommand, string>> = {
  bold: KEYS.bold,
  italic: KEYS.italic,
  underline: KEYS.underline,
  strike: KEYS.strikethrough,
  code: KEYS.code,
  superscript: KEYS.sup,
  subscript: KEYS.sub,
  highlight: KEYS.highlight,
  'text-color': KEYS.color,
};

/** Marks that must be cleared when the opposite one is applied. */
const MARK_CONFLICTS: Partial<Record<ToolbarCommand, string>> = {
  superscript: KEYS.sub,
  subscript: KEYS.sup,
};

/** Shared toolbar command → Plate block type. */
const BLOCK_BY_COMMAND: Partial<Record<ToolbarCommand, string>> = {
  paragraph: KEYS.p,
  'heading-1': KEYS.h1,
  'heading-2': KEYS.h2,
  'heading-3': KEYS.h3,
  'heading-4': KEYS.h4,
  'heading-5': KEYS.h5,
  'heading-6': KEYS.h6,
  blockquote: KEYS.blockquote,
};

const LIST_STYLE_BY_COMMAND: Partial<Record<ToolbarCommand, string>> = {
  'bullet-list': ListStyleType.Disc,
  'ordered-list': ListStyleType.Decimal,
  'task-list': KEYS.listTodo,
};

/** Every style a bullet/ordered list can carry, for the active check. */
const LIST_STYLE_FAMILY: Partial<Record<ToolbarCommand, string[]>> = {
  'bullet-list': [ListStyleType.Disc, ListStyleType.Circle, ListStyleType.Square],
  'ordered-list': [
    ListStyleType.Decimal,
    ListStyleType.LowerAlpha,
    ListStyleType.UpperAlpha,
    ListStyleType.LowerRoman,
    ListStyleType.UpperRoman,
  ],
  'task-list': [KEYS.listTodo],
};

const ALIGNMENT_BY_COMMAND: Partial<Record<ToolbarCommand, string>> = {
  'align-left': 'left',
  'align-center': 'center',
  'align-right': 'right',
  'align-justify': 'justify',
};

const DEFAULT_TEXT_COLOR = '#ef4444';
const DEFAULT_HIGHLIGHT_COLOR = '#fde047';

const TABLE_COMMANDS = new Set<ToolbarCommand>([
  'table.add-row-before',
  'table.add-row-after',
  'table.delete-row',
  'table.add-column-before',
  'table.add-column-after',
  'table.delete-column',
  'table.merge-cells',
  'table.split-cell',
  'table.toggle-header-row',
  'table.delete',
]);

/** Whether a plugin is registered on this editor instance. */
export function hasPlugin(editor: PlateEditor, key: string): boolean {
  return Boolean(editor.plugins?.[key]);
}

/** Plugin a command needs; missing plugins render as disabled buttons. */
function requiredPlugin(command: ToolbarCommand): string | undefined {
  if (TABLE_COMMANDS.has(command) || command === 'table') return KEYS.table;

  switch (command) {
    case 'highlight':
      return KEYS.highlight;
    case 'text-color':
      return KEYS.color;
    case 'link':
      return KEYS.link;
    case 'image':
      return KEYS.img;
    case 'video':
      return KEYS.video;
    case 'math':
      return KEYS.equation;
    case 'callout':
      return KEYS.callout;
    case 'columns':
      return KEYS.columnGroup;
    case 'emoji':
      return KEYS.emoji;
    case 'code-block':
      return KEYS.codeBlock;
    case 'bullet-list':
    case 'ordered-list':
    case 'task-list':
      return KEYS.list;
    case 'indent':
    case 'outdent':
      return KEYS.indent;
    case 'align-left':
    case 'align-center':
    case 'align-right':
    case 'align-justify':
      return KEYS.textAlign;
    default:
      return undefined;
  }
}

/** True while the caret sits inside a table. */
export function isInsideTable(editor: PlateEditor): boolean {
  if (!editor.selection) return false;

  return Boolean(getTableAbove(editor));
}

/**
 * Merge/split availability, mirroring Plate's own `useTableMergeState` so the
 * toolbar disables them for the same selections Tiptap's `can().mergeCells()`
 * rejects. Without this the two engines would disagree on the enabled state of
 * two buttons that look identical.
 */
function tableMergeState(editor: PlateEditor): { canMerge: boolean; canSplit: boolean } {
  if (!isInsideTable(editor)) return { canMerge: false, canSplit: false };

  const entries = getSelectedCellEntries(editor);
  if (!entries?.length) return { canMerge: false, canSplit: false };

  const cells = entries.map(([cell]) => cell);

  if (cells.length > 1) {
    const { maxCol, maxRow, minCol, minRow } = getSelectedCellsBoundingBox(editor, cells);
    const covered = cells.reduce(
      (total, cell) => total + getColSpan(cell as any) * getRowSpan(cell as any),
      0,
    );
    const rectangular = covered === (maxCol - minCol + 1) * (maxRow - minRow + 1);

    return { canMerge: editor.api.isExpanded() && rectangular, canSplit: false };
  }

  const [cell] = cells;

  return {
    canMerge: false,
    canSplit: getColSpan(cell as any) > 1 || getRowSpan(cell as any) > 1,
  };
}

function resolveUrl(payload: ToolbarCommandPayload | undefined, message: string) {
  if (payload?.value) return payload.value;
  if (typeof window === 'undefined') return undefined;

  return window.prompt(message) ?? undefined;
}

export function executePlateCommand(
  editor: PlateEditor,
  command: ToolbarCommand,
  payload?: ToolbarCommandPayload,
): void {
  editor.tf.focus();

  const mark = MARK_BY_COMMAND[command];
  if (mark && command !== 'text-color' && command !== 'highlight') {
    editor.tf.toggleMark(mark, { remove: MARK_CONFLICTS[command] });
    return;
  }

  const block = BLOCK_BY_COMMAND[command];
  if (block) {
    // Blockquote wraps its content; headings and paragraphs replace the type.
    editor.tf.toggleBlock(block, block === KEYS.blockquote ? { wrap: true } : undefined);
    return;
  }

  const listStyleType = LIST_STYLE_BY_COMMAND[command];
  if (listStyleType) {
    toggleList(editor, { listStyleType });
    return;
  }

  const alignment = ALIGNMENT_BY_COMMAND[command];
  if (alignment) {
    editor.getTransforms(TextAlignPlugin).textAlign.setNodes(alignment as any);
    return;
  }

  switch (command) {
    case 'undo':
      editor.tf.undo();
      return;
    case 'redo':
      editor.tf.redo();
      return;

    case 'text-color': {
      const color = payload?.value ?? DEFAULT_TEXT_COLOR;
      if (editor.api.marks()?.[KEYS.color] === color) {
        editor.tf.removeMarks(KEYS.color);
      } else {
        editor.tf.addMarks({ [KEYS.color]: color });
      }
      return;
    }
    case 'highlight': {
      if (editor.api.marks()?.[KEYS.highlight]) {
        editor.tf.removeMarks(KEYS.highlight);
      } else {
        editor.tf.addMarks({
          [KEYS.highlight]: payload?.value ?? DEFAULT_HIGHLIGHT_COLOR,
        });
      }
      return;
    }
    case 'clear-formatting':
      editor.tf.removeMarks(Object.values(MARK_BY_COMMAND) as string[]);
      editor.tf.toggleBlock(KEYS.p);
      return;

    case 'code-block':
      toggleCodeBlock(editor);
      return;

    case 'link':
      // Plate owns the link UX through its floating link toolbar; use it rather
      // than a second prompt when no URL was supplied.
      if (payload?.value) {
        upsertLink(editor, { url: payload.value });
      } else {
        triggerFloatingLink(editor, { focused: true });
      }
      return;
    case 'image': {
      const src = resolveUrl(payload, 'Image URL');
      if (!src) return;
      insertImage(editor, src);
      return;
    }
    case 'video': {
      const src = resolveUrl(payload, 'Video URL');
      if (!src) return;
      insertMedia(editor, { select: true, type: KEYS.video, url: src } as any);
      return;
    }
    case 'table':
      insertTable(editor, { colCount: 3, rowCount: 3 }, { select: true });
      return;
    case 'horizontal-rule':
      editor.tf.insertNodes({ children: [{ text: '' }], type: KEYS.hr } as any);
      return;
    case 'emoji':
      // Same contract as Tiptap: type the `:` trigger and let the emoji
      // combobox take over.
      editor.tf.insertText(':');
      return;
    case 'math':
      insertEquation(editor, { select: true });
      return;
    case 'callout':
      insertCallout(editor, { select: true });
      return;
    case 'columns':
      insertColumnGroup(editor, { columns: 2, select: true });
      return;

    case 'indent':
      indent(editor);
      return;
    case 'outdent':
      outdent(editor);
      return;

    case 'table.add-row-before':
      insertTableRow(editor, { before: true });
      return;
    case 'table.add-row-after':
      insertTableRow(editor);
      return;
    case 'table.delete-row':
      deleteRow(editor);
      return;
    case 'table.add-column-before':
      insertTableColumn(editor, { before: true });
      return;
    case 'table.add-column-after':
      insertTableColumn(editor);
      return;
    case 'table.delete-column':
      deleteColumn(editor);
      return;
    case 'table.merge-cells':
      mergeTableCells(editor);
      return;
    case 'table.split-cell':
      splitTableCell(editor);
      return;
    case 'table.toggle-header-row': {
      const entry = getTableAbove(editor);
      if (!entry) return;
      const [node, path] = entry;
      editor.tf.setNodes({ headerRow: !(node as any).headerRow } as any, { at: path });
      return;
    }
    case 'table.delete':
      deleteTable(editor);
      return;

    default:
      return;
  }
}

export function isPlateCommandActive(editor: PlateEditor, command: ToolbarCommand): boolean {
  // Plate's todo list is an indent-list variant with its own query, so it does
  // not go through `someList`.
  if (command === 'task-list') return someTodoList(editor);

  const listFamily = LIST_STYLE_FAMILY[command];
  if (listFamily) return someList(editor, listFamily);

  const mark = MARK_BY_COMMAND[command];
  if (mark) return Boolean(editor.api.marks()?.[mark]);

  const block = BLOCK_BY_COMMAND[command];
  if (block) return editor.api.some({ match: { type: block } });

  if (command === 'code-block') return editor.api.some({ match: { type: KEYS.codeBlock } });
  if (command === 'table') return isInsideTable(editor);
  if (command === 'callout') return editor.api.some({ match: { type: KEYS.callout } });
  if (command === 'columns') return editor.api.some({ match: { type: KEYS.column } });
  if (command === 'link') return editor.api.some({ match: { type: KEYS.link } });

  const alignment = ALIGNMENT_BY_COMMAND[command];
  if (alignment) {
    return editor.api.some({ match: (node: any) => node[KEYS.textAlign] === alignment });
  }

  return false;
}

export function isPlateCommandEnabled(editor: PlateEditor, command: ToolbarCommand): boolean {
  const plugin = requiredPlugin(command);
  if (plugin && !hasPlugin(editor, plugin)) return false;

  if (command === 'undo') return editor.history.undos.length > 0;
  if (command === 'redo') return editor.history.redos.length > 0;

  // Table operations only apply inside a table — the same rule the Tiptap
  // adapter enforces via `editor.isActive('table')`.
  if (command === 'table.merge-cells') return tableMergeState(editor).canMerge;
  if (command === 'table.split-cell') return tableMergeState(editor).canSplit;
  if (TABLE_COMMANDS.has(command)) return isInsideTable(editor);

  return !editor.api.isReadOnly?.();
}

export function getPlateCommandValue(
  editor: PlateEditor,
  command: ToolbarCommand,
): string | undefined {
  const marks = editor.api.marks() as Record<string, unknown> | null;

  if (command === 'text-color') return marks?.[KEYS.color] as string | undefined;
  if (command === 'highlight') return marks?.[KEYS.highlight] as string | undefined;

  return undefined;
}
