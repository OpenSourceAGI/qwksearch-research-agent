import { NodeSelection } from '@tiptap/pm/state';
import { describe, expect, it, vi } from 'vitest';
import { deleteNode } from '../src/utils/delete-node';
import { columnsNode, docNode, paragraphNode, schema, stateAt } from './helpers/schema';

describe('deleteNode', () => {
  it('deletes the matching ancestor of the text selection', () => {
    const state = stateAt(docNode(schema.nodes.callout.create(null, paragraphNode('note'))), 3);
    const dispatchTransaction = vi.fn();

    expect(deleteNode('callout', { state, dispatchTransaction } as any)).toBe(true);
    expect(dispatchTransaction).toHaveBeenCalledTimes(1);
    const nextDoc = dispatchTransaction.mock.calls[0][0].doc;
    expect(nextDoc.child(0).type.name).not.toBe('callout');
  });

  it('reports success even when the editor has no dispatchTransaction', () => {
    const state = stateAt(docNode(schema.nodes.callout.create(null, paragraphNode('note'))), 3);

    expect(deleteNode('callout', { state } as any)).toBe(true);
  });

  it('walks up through several levels to find the node type', () => {
    const state = stateAt(docNode(columnsNode(2)), 3);
    const dispatchTransaction = vi.fn();

    expect(deleteNode('columns', { state, dispatchTransaction } as any)).toBe(true);
  });

  it('returns false when no ancestor matches', () => {
    const state = stateAt(docNode(paragraphNode('plain')), 2);
    const dispatchTransaction = vi.fn();

    expect(deleteNode('callout', { state, dispatchTransaction } as any)).toBe(false);
    expect(dispatchTransaction).not.toHaveBeenCalled();
  });

  it('deletes the selection when a matching node is selected directly', () => {
    const base = stateAt(docNode(schema.nodes.callout.create(null, paragraphNode('note'))), 3);
    const state = base.apply(base.tr.setSelection(NodeSelection.create(base.doc, 0)));
    const run = vi.fn();
    const deleteSelection = vi.fn(() => ({ run }));
    const editor = { state, chain: () => ({ deleteSelection }) } as any;

    expect(deleteNode('callout', editor)).toBe(true);
    expect(run).toHaveBeenCalled();
  });

  it('falls back to the node sitting at the selection position', () => {
    // depth 0 with a non-matching node selection, so the fallback branch runs.
    const base = stateAt(docNode(paragraphNode('a'), schema.nodes.callout.create(null, paragraphNode('b'))), 1);
    const calloutPos = base.doc.child(0).nodeSize;
    const state = base.apply(base.tr.setSelection(NodeSelection.create(base.doc, calloutPos)));
    const dispatchTransaction = vi.fn();
    const editor = {
      state,
      dispatchTransaction,
      chain: () => ({ deleteSelection: () => ({ run: () => {} }) }),
    } as any;

    expect(deleteNode('paragraph', editor)).toBe(false);
    expect(deleteNode('callout', editor)).toBe(true);
  });
});
