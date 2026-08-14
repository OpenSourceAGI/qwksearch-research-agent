/**
 * Coverage for the sidebar's "Related" panel keyword-overlap ranking.
 */
import { describe, expect, it } from 'vitest';

import type { Document } from '@/documents/DocumentTree';
import { findRelatedDocuments } from '@/search/relatedDocuments';

function makeDoc(overrides: Partial<Document> & { id: string }): Document {
  return {
    title: 'Untitled',
    content: '',
    parentId: null,
    ...overrides,
  };
}

describe('findRelatedDocuments', () => {
  it('returns an empty list when there is no active document', () => {
    const docs = [makeDoc({ id: '1', title: 'Recipes', content: '<p>Pasta</p>' })];

    expect(findRelatedDocuments(docs, undefined)).toEqual([]);
    expect(findRelatedDocuments(docs, null)).toEqual([]);
  });

  it('ranks documents by the number of shared significant keywords, most shared first', () => {
    const active = makeDoc({
      id: 'active',
      title: 'Sprint Planning',
      content: '<p>backlog grooming velocity</p>',
    });
    const docs = [
      active,
      makeDoc({ id: 'strong', title: 'Sprint Retro', content: '<p>backlog grooming velocity notes</p>' }),
      makeDoc({ id: 'weak', title: 'Sprint Notes', content: '<p>random unrelated words</p>' }),
      makeDoc({ id: 'none', title: 'Groceries', content: '<p>milk eggs bread</p>' }),
    ];

    const results = findRelatedDocuments(docs, active);

    expect(results.map((r) => r.document.id)).toEqual(['strong', 'weak']);
    expect(results[0].sharedKeywordCount).toBeGreaterThan(results[1].sharedKeywordCount);
  });

  it('never includes the active document itself', () => {
    const active = makeDoc({ id: 'active', title: 'Budget Plan', content: '<p>budget plan finances</p>' });
    const docs = [active];

    expect(findRelatedDocuments(docs, active)).toEqual([]);
  });

  it('excludes folders and soft-deleted documents from suggestions', () => {
    const active = makeDoc({ id: 'active', title: 'Budget Plan', content: '<p>budget finances quarterly</p>' });
    const docs = [
      active,
      makeDoc({ id: 'folder', title: 'Budget Folder', content: '<p>budget finances quarterly</p>', isFolder: true }),
      makeDoc({ id: 'deleted', title: 'Old Budget', content: '<p>budget finances quarterly</p>', isDeleted: true }),
    ];

    expect(findRelatedDocuments(docs, active)).toEqual([]);
  });

  it('returns an empty list when there is no keyword overlap with any other document', () => {
    const active = makeDoc({ id: 'active', title: 'Budget Plan', content: '<p>budget finances quarterly</p>' });
    const docs = [active, makeDoc({ id: 'other', title: 'Groceries', content: '<p>milk eggs bread</p>' })];

    expect(findRelatedDocuments(docs, active)).toEqual([]);
  });

  it('respects the limit parameter', () => {
    const active = makeDoc({ id: 'active', title: 'Sprint Planning', content: '<p>backlog grooming velocity</p>' });
    const docs = [
      active,
      ...Array.from({ length: 5 }, (_, i) =>
        makeDoc({ id: `related-${i}`, title: `Sprint Doc ${i}`, content: '<p>backlog grooming velocity</p>' }),
      ),
    ];

    expect(findRelatedDocuments(docs, active, 2)).toHaveLength(2);
  });

  it('ignores short and generic stopwords when extracting keywords', () => {
    const active = makeDoc({ id: 'active', title: 'The Plan', content: '<p>with that this were about</p>' });
    const docs = [active, makeDoc({ id: 'other', title: 'The Idea', content: '<p>with that this were about</p>' })];

    expect(findRelatedDocuments(docs, active)).toEqual([]);
  });
});
