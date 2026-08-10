import { describe, expect, it } from 'vitest';
import {
  findNode,
  getCurrentNode,
  getNodeAtPos,
  isBulletListNode,
  isInCallout,
  isInCodeBlock,
  isInCustomNode,
  isInTitle,
  isListNode,
  isOrderedListNode,
  isTitleNode,
  isTodoListNode,
} from '../src/utils/node';
import { docNode, paragraphNode, schema, stateAt } from './helpers/schema';

const { title, bulletList, orderedList, taskList, listItem, codeBlock, callout } = schema.nodes;

describe('node type predicates', () => {
  it('identifies a title node', () => {
    expect(isTitleNode(title.create(null, schema.text('T')))).toBe(true);
    expect(isTitleNode(paragraphNode())).toBe(false);
  });

  it('identifies the three list node types', () => {
    const item = listItem.create(null, paragraphNode('item'));

    expect(isBulletListNode(bulletList.create(null, item))).toBe(true);
    expect(isOrderedListNode(orderedList.create(null, item))).toBe(true);
    expect(isTodoListNode(taskList.create(null, item))).toBe(true);
    expect(isBulletListNode(orderedList.create(null, item))).toBe(false);
  });

  it('treats every list flavour as a list', () => {
    const item = listItem.create(null, paragraphNode('item'));

    expect(isListNode(bulletList.create(null, item))).toBe(true);
    expect(isListNode(orderedList.create(null, item))).toBe(true);
    expect(isListNode(taskList.create(null, item))).toBe(true);
    expect(isListNode(paragraphNode())).toBe(false);
  });
});

describe('getCurrentNode', () => {
  it('returns the top-level block containing the selection', () => {
    const state = stateAt(docNode(paragraphNode('first'), paragraphNode('second')), 9);

    expect(getCurrentNode(state).textContent).toBe('second');
  });

  it('returns the outermost block for a nested selection', () => {
    const nested = callout.create(null, paragraphNode('inside'));
    const state = stateAt(docNode(nested), 3);

    expect(getCurrentNode(state).type.name).toBe('callout');
  });
});

describe('getNodeAtPos', () => {
  it('resolves the top-level block at an arbitrary position', () => {
    const state = stateAt(docNode(paragraphNode('first'), paragraphNode('second')), 1);

    expect(getNodeAtPos(state, 9).textContent).toBe('second');
  });

  it('returns null at the document root', () => {
    const state = stateAt(docNode(paragraphNode('first')), 1);

    expect(getNodeAtPos(state, 0)).toBeNull();
  });
});

describe('isInCustomNode', () => {
  it('returns false when the schema has no such node', () => {
    const state = stateAt(docNode(paragraphNode()), 1);

    expect(isInCustomNode(state, 'doesNotExist')).toBe(false);
  });

  it('detects an ancestor of the given type', () => {
    const state = stateAt(docNode(callout.create(null, paragraphNode('inside'))), 3);

    expect(isInCustomNode(state, 'callout')).toBe(true);
    expect(isInCustomNode(state, 'codeBlock')).toBe(false);
  });
});

describe('isInCodeBlock / isInCallout', () => {
  it('detects a code block', () => {
    const state = stateAt(docNode(codeBlock.create(null, schema.text('const a = 1'))), 2);

    expect(isInCodeBlock(state)).toBe(true);
    expect(isInCallout(state)).toBe(false);
  });

  it('detects a callout', () => {
    const state = stateAt(docNode(callout.create(null, paragraphNode('note'))), 3);

    expect(isInCallout(state)).toBe(true);
  });
});

describe('isInTitle', () => {
  it('treats position 0 as the title', () => {
    expect(isInTitle({ selection: { $head: { pos: 0 } } } as any)).toBe(true);
  });

  it('detects a title ancestor', () => {
    const state = stateAt(docNode(title.create(null, schema.text('Heading'))), 2);

    expect(isInTitle(state)).toBe(true);
  });

  it('returns false inside a plain paragraph', () => {
    const state = stateAt(docNode(paragraphNode('body')), 2);

    expect(isInTitle(state)).toBe(false);
  });
});

describe('findNode', () => {
  const editor = {
    getJSON: () => ({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
        {
          type: 'callout',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }],
        },
      ],
    }),
  } as any;

  it('collects every node of the given type, at any depth', () => {
    expect(findNode(editor, 'paragraph')).toHaveLength(2);
    expect(findNode(editor, 'callout')).toHaveLength(1);
  });

  it('returns an empty list when nothing matches', () => {
    expect(findNode(editor, 'image')).toEqual([]);
  });
});
