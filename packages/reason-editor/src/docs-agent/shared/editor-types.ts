/**
 * Engine-neutral editor contract shared by the Tiptap and Plate versions of the
 * Reason Editor.
 *
 * Nothing in this folder may import `@tiptap/*` or `platejs*`: the whole point
 * of the split is that the product UX (toolbar layout, labels, icons, shortcut
 * hints, submenu hierarchy) is declared once, and only the command
 * implementation differs per engine. Engine-specific type/key mapping belongs in
 * `../tiptap/editor-adapter.ts` and `../plate/plate-adapter.ts`.
 */

/** Which editor engine is driving a route. */
export type EditorEngine = 'tiptap' | 'plate';

/**
 * Contextual table commands. They are only surfaced while the caret is inside a
 * table (see `isActive('table')` in the renderer) and both adapters report them
 * as disabled outside one.
 */
export type TableCommand =
  | 'table.add-row-before'
  | 'table.add-row-after'
  | 'table.delete-row'
  | 'table.add-column-before'
  | 'table.add-column-after'
  | 'table.delete-column'
  | 'table.merge-cells'
  | 'table.split-cell'
  | 'table.toggle-header-row'
  | 'table.delete';

/** Every action the shared toolbar can ask an engine to perform. */
export type ToolbarCommand =
  // History
  | 'undo'
  | 'redo'
  // Inline marks
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'superscript'
  | 'subscript'
  | 'text-color'
  | 'highlight'
  | 'clear-formatting'
  // Block types
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'blockquote'
  | 'code-block'
  // Lists
  | 'bullet-list'
  | 'ordered-list'
  | 'task-list'
  // Insert
  | 'link'
  | 'image'
  | 'video'
  | 'table'
  | 'horizontal-rule'
  | 'emoji'
  | 'math'
  | 'callout'
  | 'columns'
  // Layout
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'indent'
  | 'outdent'
  | TableCommand;

/**
 * Optional data for commands that need a value (a link URL, an image source, a
 * colour). When it is omitted the adapter falls back to its engine's own UI —
 * Plate's floating link toolbar, Tiptap's link dialog — or to a prompt.
 */
export interface ToolbarCommandPayload {
  value?: string;
}

/**
 * The one interface both engines implement. The toolbar never branches on the
 * engine; it only calls these four methods.
 */
export interface EditorToolbarAdapter {
  /** Which engine is behind this adapter. Diagnostics only — never branch on it in shared UI. */
  readonly engine: EditorEngine;
  /** Run a command. Focus handling is the adapter's responsibility. */
  execute(command: ToolbarCommand, payload?: ToolbarCommandPayload): void | Promise<void>;
  /** Whether the command's formatting is applied at the current selection. */
  isActive(command: ToolbarCommand): boolean;
  /** Whether the command can run at the current selection. */
  isEnabled(command: ToolbarCommand): boolean;
  /** Current value for value-carrying commands (e.g. the active text colour). */
  getValue?(command: ToolbarCommand): string | undefined;
  /**
   * Subscribe to editor changes so the toolbar can refresh its active/disabled
   * state. Returns an unsubscribe function.
   */
  subscribe?(listener: () => void): () => void;
}

/**
 * An adapter that answers "no" to everything — used while an editor is still
 * mounting so the toolbar can render in a disabled state instead of unmounting.
 */
export function createNullAdapter(engine: EditorEngine): EditorToolbarAdapter {
  return {
    engine,
    execute() {},
    isActive() {
      return false;
    },
    isEnabled() {
      return false;
    },
    getValue() {
      return undefined;
    },
    subscribe() {
      return () => {};
    },
  };
}
