/**
 * Parity tests for the two engines behind the shared toolbar.
 *
 * The assertions are deliberately written against the *adapter interface*, not
 * against either document model: the toolbar only ever calls `execute`,
 * `isActive` and `isEnabled`, so those three are what has to agree. Where a test
 * needs to look inside the document (media insertion, table row counts), each
 * harness supplies its own engine-specific probe.
 */

import { Editor } from '@tiptap/core';
import { createPlateEditor } from 'platejs/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildExtensions, createDefaultConfig } from '../../src/editor-views/config/editorConfig';
import { createPlateAdapter } from '../../src/docs-agent/plate/plate-adapter';
import { platePlugins } from '../../src/docs-agent/plate/plate-editor-config';
import type { EditorToolbarAdapter, ToolbarCommand } from '../../src/docs-agent/shared/editor-types';
import { collectToolbarCommands } from '../../src/docs-agent/shared/toolbar-schema';
import { createTiptapAdapter } from '../../src/docs-agent/tiptap/editor-adapter';

/** Lets a microtask-coalesced subscription fire before asserting on it. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface Harness {
  adapter: EditorToolbarAdapter;
  /** Types a word so the selection is non-empty and history has something to undo. */
  typeText(text: string): void;
  /** All node type names in the document, flattened. */
  nodeTypes(): string[];
  /** Number of rows in the first table in the document. */
  tableRowCount(): number;
  /** Plain text of the document. */
  text(): string;
  /** This engine's node type for an inserted image. */
  mediaNodeType: string;
}

function flatten(nodes: any[], out: string[] = []): string[] {
  for (const node of nodes ?? []) {
    if (node?.type) out.push(node.type);
    if (Array.isArray(node?.content)) flatten(node.content, out);
    if (Array.isArray(node?.children)) flatten(node.children, out);
  }

  return out;
}

function findNode(nodes: any[], type: string): any | undefined {
  for (const node of nodes ?? []) {
    if (node?.type === type) return node;

    const nested =
      findNode(node?.content ?? [], type) ?? findNode(node?.children ?? [], type);
    if (nested) return nested;
  }

  return undefined;
}

function createTiptapHarness(): Harness {
  const editor = new Editor({
    content: '<p>Hello world</p>',
    extensions: buildExtensions(createDefaultConfig()),
  });

  // Select *within* the first block rather than the whole document: a trailing
  // node extension appends an empty paragraph, and a selection spanning both
  // blocks makes every block-level `isActive` ambiguous.
  const selectFirstBlock = () => {
    const first = editor.state.doc.child(0);
    editor.commands.setTextSelection({ from: 1, to: 1 + first.content.size });
  };

  selectFirstBlock();

  return {
    adapter: createTiptapAdapter(editor),
    typeText(text) {
      editor.commands.insertContent(text);
      selectFirstBlock();
    },
    nodeTypes: () => flatten([editor.getJSON()]),
    tableRowCount: () => findNode([editor.getJSON()], 'table')?.content?.length ?? 0,
    text: () => editor.getText(),
    mediaNodeType: 'image',
  };
}

function createPlateHarness(): Harness {
  const editor = createPlateEditor({
    plugins: platePlugins as any,
    value: [{ children: [{ text: 'Hello world' }], type: 'p' }],
  });

  // Same reasoning as the Tiptap harness: scope the selection to the first
  // block so block-level `isActive` answers about one block.
  const selectFirstBlock = () => {
    editor.tf.select(editor.api.range([0])!);
  };

  selectFirstBlock();

  return {
    adapter: createPlateAdapter(editor),
    typeText(text) {
      editor.tf.insertText(text);
      selectFirstBlock();
    },
    nodeTypes: () => flatten(editor.children as any[]),
    tableRowCount: () => findNode(editor.children as any[], 'table')?.children?.length ?? 0,
    text: () => (editor.api.string([]) as string) ?? '',
    mediaNodeType: 'img',
  };
}

const ENGINES: [name: string, create: () => Harness][] = [
  ['tiptap', createTiptapHarness],
  ['plate', createPlateHarness],
];

describe.each(ENGINES)('%s adapter', (engineName, createHarness) => {
  let harness: Harness;
  let adapter: EditorToolbarAdapter;

  beforeEach(() => {
    harness = createHarness();
    adapter = harness.adapter;
  });

  it('reports its engine', () => {
    expect(adapter.engine).toBe(engineName);
  });

  it('answers isActive and isEnabled for every command in the schema', () => {
    for (const command of collectToolbarCommands()) {
      expect(typeof adapter.isActive(command), `isActive(${command})`).toBe('boolean');
      expect(typeof adapter.isEnabled(command), `isEnabled(${command})`).toBe('boolean');
    }
  });

  describe.each([
    'bold',
    'italic',
    'underline',
    'strike',
    'code',
    'superscript',
    'subscript',
    'highlight',
  ] as ToolbarCommand[])('%s', (command) => {
    it('toggles on and off', () => {
      expect(adapter.isActive(command)).toBe(false);

      adapter.execute(command);
      expect(adapter.isActive(command), `${command} should be active`).toBe(true);

      adapter.execute(command);
      expect(adapter.isActive(command), `${command} should be inactive`).toBe(false);
    });
  });

  describe.each([
    'heading-1',
    'heading-2',
    'heading-3',
    'blockquote',
    'code-block',
  ] as ToolbarCommand[])('%s', (command) => {
    it('applies to the current block', () => {
      adapter.execute(command);

      expect(adapter.isActive(command)).toBe(true);
    });
  });

  describe.each(['bullet-list', 'ordered-list', 'task-list'] as ToolbarCommand[])(
    '%s',
    (command) => {
      it('turns the block into that list', () => {
        adapter.execute(command);

        expect(adapter.isActive(command)).toBe(true);
      });
    },
  );

  describe('text colour', () => {
    it('sets and clears the colour', () => {
      expect(adapter.getValue?.('text-color')).toBeUndefined();

      adapter.execute('text-color', { value: '#123456' });
      expect(adapter.getValue?.('text-color')).toBe('#123456');

      adapter.execute('text-color', { value: '#123456' });
      expect(adapter.getValue?.('text-color')).toBeUndefined();
    });
  });

  describe('link', () => {
    it('marks the selection as a link', () => {
      expect(adapter.isActive('link')).toBe(false);

      adapter.execute('link', { value: 'https://example.com' });

      expect(adapter.isActive('link')).toBe(true);
    });
  });

  describe('media', () => {
    it('inserts an image node', () => {
      expect(harness.nodeTypes()).not.toContain(harness.mediaNodeType);

      adapter.execute('image', { value: 'https://example.com/cat.png' });

      expect(harness.nodeTypes()).toContain(harness.mediaNodeType);
    });
  });

  describe('code block', () => {
    it('round-trips back to a paragraph', () => {
      adapter.execute('code-block');
      expect(adapter.isActive('code-block')).toBe(true);

      adapter.execute('code-block');
      expect(adapter.isActive('code-block')).toBe(false);
    });
  });

  describe('tables', () => {
    it('disables every table action outside a table', () => {
      expect(adapter.isActive('table')).toBe(false);

      for (const command of collectToolbarCommands().filter((c) => c.startsWith('table.'))) {
        expect(adapter.isEnabled(command), `${command} outside a table`).toBe(false);
      }
    });

    it('enables the row and column actions once the caret is inside a table', () => {
      adapter.execute('table');

      expect(adapter.isActive('table')).toBe(true);

      const structural = collectToolbarCommands().filter(
        (command) =>
          command.startsWith('table.') &&
          // Merge/split additionally depend on the cell selection; they are
          // covered by their own parity assertion below.
          command !== 'table.merge-cells' &&
          command !== 'table.split-cell',
      );

      for (const command of structural) {
        expect(adapter.isEnabled(command), `${command} inside a table`).toBe(true);
      }
    });

    it('keeps merge and split disabled for a single unspanned cell', () => {
      adapter.execute('table');

      expect(adapter.isEnabled('table.merge-cells')).toBe(false);
      expect(adapter.isEnabled('table.split-cell')).toBe(false);
    });

    it('adds and removes rows', () => {
      adapter.execute('table');

      const rows = harness.tableRowCount();
      expect(rows).toBeGreaterThan(0);

      adapter.execute('table.add-row-after');
      expect(harness.tableRowCount()).toBe(rows + 1);

      adapter.execute('table.delete-row');
      expect(harness.tableRowCount()).toBe(rows);
    });

    it('deletes the table', () => {
      adapter.execute('table');
      expect(adapter.isActive('table')).toBe(true);

      adapter.execute('table.delete');
      expect(adapter.isActive('table')).toBe(false);
    });
  });

  describe('history', () => {
    it('starts with nothing to undo or redo', () => {
      expect(adapter.isEnabled('undo')).toBe(false);
      expect(adapter.isEnabled('redo')).toBe(false);
    });

    it('undoes and redoes an edit', () => {
      harness.typeText('!');
      const edited = harness.text();

      expect(adapter.isEnabled('undo')).toBe(true);

      adapter.execute('undo');
      expect(harness.text()).not.toBe(edited);
      expect(adapter.isEnabled('redo')).toBe(true);

      adapter.execute('redo');
      expect(harness.text()).toBe(edited);
    });
  });

  describe('subscribe', () => {
    it('notifies on editor changes', async () => {
      let calls = 0;
      const unsubscribe = adapter.subscribe!(() => {
        calls += 1;
      });

      adapter.execute('bold');
      await flush();
      expect(calls).toBeGreaterThan(0);

      const afterUnsubscribe = calls;
      unsubscribe();
      adapter.execute('italic');
      await flush();

      expect(calls).toBe(afterUnsubscribe);
    });
  });
});

describe('cross-engine parity', () => {
  it('both adapters implement the same interface surface', () => {
    const tiptap = createTiptapHarness().adapter;
    const plate = createPlateHarness().adapter;

    const surface = (adapter: EditorToolbarAdapter) =>
      Object.keys(adapter).filter((key) => key !== 'engine').sort();

    expect(surface(tiptap)).toEqual(surface(plate));
  });

  it('agrees on the initial active state of every command', () => {
    const tiptap = createTiptapHarness().adapter;
    const plate = createPlateHarness().adapter;

    for (const command of collectToolbarCommands()) {
      expect(tiptap.isActive(command), `${command} (tiptap)`).toBe(
        plate.isActive(command),
      );
    }
  });

  it('agrees that table actions are disabled outside a table', () => {
    const tiptap = createTiptapHarness().adapter;
    const plate = createPlateHarness().adapter;

    for (const command of collectToolbarCommands().filter((c) => c.startsWith('table.'))) {
      expect(tiptap.isEnabled(command), `${command} (tiptap)`).toBe(false);
      expect(plate.isEnabled(command), `${command} (plate)`).toBe(false);
    }
  });
});
