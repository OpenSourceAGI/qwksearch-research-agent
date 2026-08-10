/**
 * A minimal ProseMirror schema mirroring the node names the editor's utils
 * branch on (`title`, list types, `codeBlock`, `callout`, `columns`/`column`).
 * Building the real Tiptap schema would drag in the whole extension set; these
 * node specs are enough to exercise the helpers under test.
 */

import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: { indent: { default: 0 } },
      toDOM: () => ['p', 0],
    },
    title: { group: 'block', content: 'inline*', toDOM: () => ['h1', 0] },
    listItem: { content: 'paragraph+', toDOM: () => ['li', 0] },
    bulletList: { group: 'block', content: 'listItem+', toDOM: () => ['ul', 0] },
    orderedList: { group: 'block', content: 'listItem+', toDOM: () => ['ol', 0] },
    taskList: { group: 'block', content: 'listItem+', toDOM: () => ['ul', 0] },
    codeBlock: {
      group: 'block',
      content: 'text*',
      marks: '',
      code: true,
      toDOM: () => ['pre', ['code', 0]],
    },
    callout: { group: 'block', content: 'block+', toDOM: () => ['div', 0] },
    column: {
      content: 'block+',
      attrs: { index: { default: 0 } },
      isolating: true,
      toDOM: () => ['div', { class: 'column' }, 0],
    },
    columns: {
      group: 'block',
      content: 'column+',
      attrs: { cols: { default: 2 } },
      toDOM: () => ['div', { class: 'columns' }, 0],
    },
    text: { group: 'inline' },
  },
});

const { doc, paragraph, columns, column } = schema.nodes;

export function paragraphNode(content = 'hello', attrs?: Record<string, unknown>) {
  return paragraph.create(attrs, content ? schema.text(content) : null);
}

export function docNode(...children: Parameters<typeof doc.create>[1][]) {
  return doc.create(null, children as any);
}

/** A `columns` node with `count` columns, each holding one paragraph. */
export function columnsNode(count = 2) {
  const cols = Array.from({ length: count }, (_, index) =>
    column.create({ index }, paragraphNode(`col ${index}`))
  );
  return columns.create({ cols: count }, cols);
}

/** Builds a state whose text selection sits at `pos`. */
export function stateAt(docNodeValue: ReturnType<typeof doc.create>, pos: number) {
  const state = EditorState.create({ schema, doc: docNodeValue });
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))));
}
