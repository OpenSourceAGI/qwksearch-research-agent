import { describe, expect, it, vi } from 'vitest';
import {
  addOrDeleteCol,
  createColumn,
  createColumns,
  getColumnsNodeTypes,
} from '../src/utils/columns';
import { gotoCol } from '../src/utils/columns';
import { columnsNode, docNode, paragraphNode, schema, stateAt } from './helpers/schema';

/**
 * Layout of `doc(columns(column(p), column(p)))`:
 *   0 columns | 1 column#0 | 2 paragraph | 3.. text
 * so position 3 is inside the first column and 3 + column#0.nodeSize is inside
 * the second.
 */
function columnsState(count = 2) {
  return stateAt(docNode(columnsNode(count)), 3);
}

describe('createColumn', () => {
  it('fills a column with the schema default content', () => {
    const col = createColumn(schema.nodes.column, 2);

    expect(col?.type.name).toBe('column');
    expect(col?.attrs.index).toBe(2);
    expect(col?.childCount).toBe(1);
  });

  it('uses the supplied content when given', () => {
    const col = createColumn(schema.nodes.column, 0, paragraphNode('custom') as any);

    expect(col.textContent).toBe('custom');
  });
});

describe('getColumnsNodeTypes', () => {
  it('returns the columns and column node types', () => {
    const fresh = { nodes: schema.nodes, cached: {} as any };

    const types = getColumnsNodeTypes(fresh);

    expect(types.columns).toBe(schema.nodes.columns);
    expect(types.column).toBe(schema.nodes.column);
  });

  it('caches the lookup on the schema', () => {
    const fresh = { nodes: schema.nodes, cached: {} as any };

    const first = getColumnsNodeTypes(fresh);

    expect(getColumnsNodeTypes(fresh)).toBe(first);
    expect(fresh.cached.columnsNodeTypes).toBe(first);
  });
});

describe('createColumns', () => {
  it('builds a columns node with the requested number of columns', () => {
    const node = createColumns({ nodes: schema.nodes, cached: {} }, 3);

    expect(node.type.name).toBe('columns');
    expect(node.attrs.cols).toBe(3);
    expect(node.childCount).toBe(3);
    expect(node.child(2).attrs.index).toBe(2);
  });
});

describe('addOrDeleteCol', () => {
  it('inserts a column before the current one', () => {
    const state = columnsState(2);
    const dispatch = vi.fn();

    expect(addOrDeleteCol({ state, dispatch, type: 'addBefore' })).toBe(true);

    const cols = dispatch.mock.calls[0][0].doc.child(0);
    expect(cols.childCount).toBe(3);
    expect(cols.attrs.cols).toBe(3);
  });

  it('inserts a column after the current one', () => {
    const state = columnsState(2);
    const dispatch = vi.fn();

    addOrDeleteCol({ state, dispatch, type: 'addAfter' });

    const cols = dispatch.mock.calls[0][0].doc.child(0);
    expect(cols.childCount).toBe(3);
    // The original first column keeps its text, so the new one landed after it.
    expect(cols.child(0).textContent).toBe('col 0');
  });

  it('reindexes every column after an insert', () => {
    const state = columnsState(2);
    const dispatch = vi.fn();

    addOrDeleteCol({ state, dispatch, type: 'addAfter' });

    const cols = dispatch.mock.calls[0][0].doc.child(0);
    expect([0, 1, 2].map((i) => cols.child(i).attrs.index)).toEqual([0, 1, 2]);
  });

  it('deletes the current column', () => {
    const state = columnsState(3);
    const dispatch = vi.fn();

    addOrDeleteCol({ state, dispatch, type: 'delete' });

    const cols = dispatch.mock.calls[0][0].doc.child(0);
    expect(cols.childCount).toBe(2);
    expect(cols.attrs.cols).toBe(2);
  });

  it('does nothing when the selection is not inside a columns node', () => {
    const state = stateAt(docNode(paragraphNode('plain')), 2);
    const dispatch = vi.fn();

    expect(addOrDeleteCol({ state, dispatch, type: 'addAfter' })).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does nothing without a dispatch function', () => {
    const state = columnsState(2);

    expect(addOrDeleteCol({ state, dispatch: undefined, type: 'delete' })).toBe(true);
  });
});

describe('gotoCol', () => {
  it('moves the selection to the next column', () => {
    const state = columnsState(3);
    const dispatch = vi.fn();

    expect(gotoCol({ state, dispatch, type: 'after' })).toBe(true);

    const tr = dispatch.mock.calls[0][0];
    expect(tr.doc.resolve(tr.selection.from).parent.textContent).toBe('col 1');
  });

  it('wraps around to the last column when moving before the first', () => {
    const state = columnsState(3);
    const dispatch = vi.fn();

    gotoCol({ state, dispatch, type: 'before' });

    const tr = dispatch.mock.calls[0][0];
    expect(tr.doc.resolve(tr.selection.from).parent.textContent).toBe('col 2');
  });

  it('returns false when the selection is not inside a columns node', () => {
    const state = stateAt(docNode(paragraphNode('plain')), 2);

    expect(gotoCol({ state, dispatch: vi.fn(), type: 'after' })).toBe(false);
  });
});
