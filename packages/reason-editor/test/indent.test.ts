import { AllSelection, NodeSelection } from '@tiptap/pm/state';
import { describe, expect, it, vi } from 'vitest';
import { clamp, createIndentCommand, setNodeIndentMarkup } from '../src/utils/indent';
import { docNode, paragraphNode, schema, stateAt } from './helpers/schema';

/** `isList` only reads `editor.extensionManager.extensions`. */
const editor = { extensionManager: { extensions: [] } } as any;

describe('clamp', () => {
  it('returns the value when it is inside the range', () => {
    expect(clamp(3, 0, 7)).toBe(3);
  });

  it('clamps below the minimum', () => {
    expect(clamp(-2, 0, 7)).toBe(0);
  });

  it('clamps above the maximum', () => {
    expect(clamp(99, 0, 7)).toBe(7);
  });
});

describe('setNodeIndentMarkup', () => {
  it('bumps the indent attribute of the node at the position', () => {
    const state = stateAt(docNode(paragraphNode('hello')), 1);

    const tr = setNodeIndentMarkup(state.tr, 0, 1);

    expect(tr.doc.nodeAt(0)?.attrs.indent).toBe(1);
  });

  it('clamps the indent at the maximum of 7', () => {
    const state = stateAt(docNode(paragraphNode('hello', { indent: 7 })), 1);

    const tr = setNodeIndentMarkup(state.tr, 0, 1);

    expect(tr.docChanged).toBe(false);
  });

  it('clamps the indent at the minimum of 0', () => {
    const state = stateAt(docNode(paragraphNode('hello')), 1);

    const tr = setNodeIndentMarkup(state.tr, 0, -1);

    expect(tr.docChanged).toBe(false);
  });

  it('returns the transaction untouched when there is no node at the position', () => {
    const state = stateAt(docNode(paragraphNode('hello')), 1);

    const tr = setNodeIndentMarkup(state.tr, state.doc.content.size, 1);

    expect(tr.docChanged).toBe(false);
  });
});

describe('createIndentCommand', () => {
  it('indents the selected paragraph and dispatches', () => {
    const state = stateAt(docNode(paragraphNode('hello')), 2);
    const dispatch = vi.fn();

    const result = createIndentCommand({ delta: 1, types: ['paragraph'] })({
      state,
      dispatch,
      editor,
    } as any);

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].doc.nodeAt(0).attrs.indent).toBe(1);
  });

  it('returns false and does not dispatch when nothing changes', () => {
    const state = stateAt(docNode(paragraphNode('hello')), 2);
    const dispatch = vi.fn();

    const result = createIndentCommand({ delta: -1, types: ['paragraph'] })({
      state,
      dispatch,
      editor,
    } as any);

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('ignores node types that are not in the list', () => {
    const state = stateAt(docNode(paragraphNode('hello')), 2);
    const dispatch = vi.fn();

    const result = createIndentCommand({ delta: 1, types: ['heading'] })({
      state,
      dispatch,
      editor,
    } as any);

    expect(result).toBe(false);
  });

  it('works across an AllSelection spanning several paragraphs', () => {
    const base = stateAt(docNode(paragraphNode('one'), paragraphNode('two')), 1);
    const state = base.apply(base.tr.setSelection(new AllSelection(base.doc)));
    const dispatch = vi.fn();

    const result = createIndentCommand({ delta: 1, types: ['paragraph'] })({
      state,
      dispatch,
      editor,
    } as any);

    expect(result).toBe(true);
    const nextDoc = dispatch.mock.calls[0][0].doc;
    expect(nextDoc.child(0).attrs.indent).toBe(1);
    expect(nextDoc.child(1).attrs.indent).toBe(1);
  });

  it('bails out for selections that are neither text nor all', () => {
    const base = stateAt(docNode(paragraphNode('one')), 1);
    const state = base.apply(base.tr.setSelection(NodeSelection.create(base.doc, 0)));
    const dispatch = vi.fn();

    const result = createIndentCommand({ delta: 1, types: ['paragraph'] })({
      state,
      dispatch,
      editor,
    } as any);

    expect(result).toBe(false);
  });

  it('does not descend into list nodes', () => {
    const { bulletList, listItem } = schema.nodes;
    const list = bulletList.create(null, listItem.create(null, paragraphNode('item')));
    const base = stateAt(docNode(list), 4);
    const state = base.apply(base.tr.setSelection(new AllSelection(base.doc)));
    const dispatch = vi.fn();

    const listAwareEditor = {
      extensionManager: {
        extensions: [
          { type: 'node', name: 'bulletList', config: { group: 'list' }, options: {}, storage: {} },
        ],
      },
    } as any;

    const result = createIndentCommand({ delta: 1, types: ['paragraph'] })({
      state,
      dispatch,
      editor: listAwareEditor,
    } as any);

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
