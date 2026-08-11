/**
 * Tiptap implementations of the shared toolbar commands.
 *
 * Every ProseMirror-specific node name, mark name and command chain lives here
 * (and nowhere else). `editor-adapter.ts` wraps these four functions in the
 * engine-neutral `EditorToolbarAdapter` the shared toolbar consumes.
 */

import type { Editor } from '@tiptap/core';

import type { ToolbarCommand, ToolbarCommandPayload } from '../shared/editor-types';

/** Commands that map straight onto a Tiptap mark of the same-ish name. */
const MARK_BY_COMMAND: Partial<Record<ToolbarCommand, string>> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
  superscript: 'superscript',
  subscript: 'subscript',
  highlight: 'highlight',
  'text-color': 'textStyle',
};

/** Commands that map onto a Tiptap node, with the attributes used for `isActive`. */
const NODE_BY_COMMAND: Partial<
  Record<ToolbarCommand, { name: string; attrs?: Record<string, unknown> }>
> = {
  paragraph: { name: 'paragraph' },
  'heading-1': { name: 'heading', attrs: { level: 1 } },
  'heading-2': { name: 'heading', attrs: { level: 2 } },
  'heading-3': { name: 'heading', attrs: { level: 3 } },
  'heading-4': { name: 'heading', attrs: { level: 4 } },
  'heading-5': { name: 'heading', attrs: { level: 5 } },
  'heading-6': { name: 'heading', attrs: { level: 6 } },
  blockquote: { name: 'blockquote' },
  'code-block': { name: 'codeBlock' },
  'bullet-list': { name: 'bulletList' },
  'ordered-list': { name: 'orderedList' },
  'task-list': { name: 'taskList' },
  table: { name: 'table' },
  callout: { name: 'callout' },
  columns: { name: 'columns' },
};

const ALIGNMENT_BY_COMMAND: Partial<Record<ToolbarCommand, string>> = {
  'align-left': 'left',
  'align-center': 'center',
  'align-right': 'right',
  'align-justify': 'justify',
};

const TABLE_COMMANDS: Partial<Record<ToolbarCommand, string>> = {
  'table.add-row-before': 'addRowBefore',
  'table.add-row-after': 'addRowAfter',
  'table.delete-row': 'deleteRow',
  'table.add-column-before': 'addColumnBefore',
  'table.add-column-after': 'addColumnAfter',
  'table.delete-column': 'deleteColumn',
  'table.merge-cells': 'mergeCells',
  'table.split-cell': 'splitCell',
  'table.toggle-header-row': 'toggleHeaderRow',
  'table.delete': 'deleteTable',
};

const DEFAULT_TEXT_COLOR = '#ef4444';
const DEFAULT_HIGHLIGHT_COLOR = '#fde047';

/** Whether an extension is registered on this editor instance. */
export function hasExtension(editor: Editor, name: string): boolean {
  return editor.extensionManager.extensions.some((extension) => extension.name === name);
}

/**
 * Commands the toolbar can offer only when the supporting extension is present.
 * Missing extensions surface as disabled buttons rather than as no-ops.
 */
function requiredExtension(command: ToolbarCommand): string | undefined {
  switch (command) {
    case 'highlight':
      return 'highlight';
    case 'text-color':
      return 'color';
    case 'superscript':
      return 'superscript';
    case 'subscript':
      return 'subscript';
    case 'task-list':
      return 'taskList';
    case 'link':
      return 'link';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'table':
      return 'table';
    case 'emoji':
      return 'emoji';
    case 'math':
      return 'katex';
    case 'callout':
      return 'callout';
    case 'columns':
      return 'columns';
    case 'indent':
    case 'outdent':
      return 'indent';
    case 'align-left':
    case 'align-center':
    case 'align-right':
    case 'align-justify':
      return 'textAlign';
    default:
      return undefined;
  }
}

/** Prompts for a URL when the caller did not supply one. */
function resolveUrl(payload: ToolbarCommandPayload | undefined, message: string) {
  if (payload?.value) return payload.value;
  if (typeof window === 'undefined') return undefined;

  return window.prompt(message) ?? undefined;
}

export function executeTiptapCommand(
  editor: Editor,
  command: ToolbarCommand,
  payload?: ToolbarCommandPayload,
): void {
  const chain = () => editor.chain().focus();
  const commands = editor.commands as any;

  const tableCommand = TABLE_COMMANDS[command];
  if (tableCommand) {
    (chain() as any)[tableCommand]?.().run();
    return;
  }

  const alignment = ALIGNMENT_BY_COMMAND[command];
  if (alignment) {
    (chain() as any).setTextAlign?.(alignment).run();
    return;
  }

  switch (command) {
    case 'undo':
      commands.undo?.();
      return;
    case 'redo':
      commands.redo?.();
      return;

    case 'bold':
      chain().toggleBold().run();
      return;
    case 'italic':
      chain().toggleItalic().run();
      return;
    case 'underline':
      (chain() as any).toggleUnderline?.().run();
      return;
    case 'strike':
      chain().toggleStrike().run();
      return;
    case 'code':
      chain().toggleCode().run();
      return;
    case 'superscript':
      (chain() as any).toggleSuperscript?.().run();
      return;
    case 'subscript':
      (chain() as any).toggleSubscript?.().run();
      return;

    case 'text-color': {
      const color = payload?.value ?? DEFAULT_TEXT_COLOR;
      if (editor.isActive('textStyle', { color })) {
        (chain() as any).unsetColor?.().run();
      } else {
        (chain() as any).setColor?.(color).run();
      }
      return;
    }
    case 'highlight': {
      const color = payload?.value ?? DEFAULT_HIGHLIGHT_COLOR;
      if (editor.isActive('highlight')) {
        (chain() as any).unsetHighlight?.().run();
      } else {
        (chain() as any).setHighlight?.({ color }).run();
      }
      return;
    }
    case 'clear-formatting':
      chain().clearNodes().unsetAllMarks().run();
      return;

    case 'paragraph':
      chain().setParagraph().run();
      return;
    case 'heading-1':
    case 'heading-2':
    case 'heading-3':
    case 'heading-4':
    case 'heading-5':
    case 'heading-6': {
      const level = Number(command.slice('heading-'.length)) as 1 | 2 | 3 | 4 | 5 | 6;
      chain().toggleHeading({ level }).run();
      return;
    }
    case 'blockquote':
      chain().toggleBlockquote().run();
      return;
    case 'code-block':
      chain().toggleCodeBlock().run();
      return;

    case 'bullet-list':
      chain().toggleBulletList().run();
      return;
    case 'ordered-list':
      chain().toggleOrderedList().run();
      return;
    case 'task-list':
      (chain() as any).toggleTaskList?.().run();
      return;

    case 'indent':
      (chain() as any).indent?.().run();
      return;
    case 'outdent':
      (chain() as any).outdent?.().run();
      return;

    case 'link': {
      const href = resolveUrl(payload, 'Link URL');
      if (!href) return;
      (chain() as any).extendMarkRange('link').setLink({ href }).run();
      return;
    }
    case 'image': {
      const src = resolveUrl(payload, 'Image URL');
      if (!src) return;
      // `setImageInline` belongs to this package's Image extension. The plain
      // `setImage` name is also claimed by the ImageGif extension, which
      // registers later and would insert an `imageGif` node instead.
      const imageChain = chain() as any;
      if (typeof imageChain.setImageInline === 'function') {
        imageChain.setImageInline({ src }).run();
      } else {
        imageChain.setImage?.({ src }).run();
      }
      return;
    }
    case 'video': {
      const src = resolveUrl(payload, 'Video URL');
      if (!src) return;
      (chain() as any).setVideo?.({ src }).run();
      return;
    }
    case 'table':
      (chain() as any)
        .insertTable?.({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
      return;
    case 'horizontal-rule':
      chain().setHorizontalRule().run();
      return;
    case 'emoji':
      // The Emoji extension opens its picker from the `:` suggestion trigger,
      // so the toolbar entry types the trigger rather than owning a second UI.
      chain().insertContent(':').run();
      return;
    case 'math':
      (chain() as any).setKatex?.({ text: payload?.value ?? '' }).run();
      return;
    case 'callout':
      (chain() as any).setCallout?.({ type: 'note', title: '', body: '' }).run();
      return;
    case 'columns':
      (chain() as any).insertColumns?.({ cols: 2 }).run();
      return;

    default:
      return;
  }
}

export function isTiptapCommandActive(editor: Editor, command: ToolbarCommand): boolean {
  const alignment = ALIGNMENT_BY_COMMAND[command];
  if (alignment) return editor.isActive({ textAlign: alignment });

  const node = NODE_BY_COMMAND[command];
  if (node) return editor.isActive(node.name, node.attrs);

  const mark = MARK_BY_COMMAND[command];
  if (mark) {
    // `textStyle` is only "active" for the colour command when a colour is set.
    if (command === 'text-color') return !!editor.getAttributes('textStyle').color;
    return editor.isActive(mark);
  }

  if (command === 'link') return editor.isActive('link');

  return false;
}

export function isTiptapCommandEnabled(editor: Editor, command: ToolbarCommand): boolean {
  const extension = requiredExtension(command);
  if (extension && !hasExtension(editor, extension)) return false;

  if (command === 'undo') return editor.can().undo();
  if (command === 'redo') return editor.can().redo();

  const tableCommand = TABLE_COMMANDS[command];
  if (tableCommand) {
    // Table operations only apply inside a table — both engines agree on this.
    if (!editor.isActive('table')) return false;
    return Boolean((editor.can() as any)[tableCommand]?.());
  }

  return editor.isEditable;
}

export function getTiptapCommandValue(
  editor: Editor,
  command: ToolbarCommand,
): string | undefined {
  if (command === 'text-color') return editor.getAttributes('textStyle').color;
  if (command === 'highlight') return editor.getAttributes('highlight').color;
  if (command === 'link') return editor.getAttributes('link').href;

  return undefined;
}
