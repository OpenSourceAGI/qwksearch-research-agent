/**
 * Coverage for the sidebar's "Related" panel keyword-overlap ranking.
 */
import { describe, expect, it } from 'vitest';

import type { Document } from '@/documents/DocumentTree';
import { findRelatedDocuments, splitTopSuggestion, type RelatedDocumentResult } from '@/search/relatedDocuments';

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

  it('includes documents that share a tag but no keywords', () => {
    const active = makeDoc({ id: 'active', title: 'Budget Plan', content: '<p>budget finances</p>', tags: ['finance'] });
    const docs = [
      active,
      makeDoc({ id: 'tagged', title: 'Unrelated Title', content: '<p>completely different words</p>', tags: ['Finance'] }),
      makeDoc({ id: 'untagged', title: 'Other Title', content: '<p>completely different words</p>' }),
    ];

    const results = findRelatedDocuments(docs, active);

    expect(results.map((r) => r.document.id)).toEqual(['tagged']);
    expect(results[0].sharedTagCount).toBe(1);
    expect(results[0].sharedKeywordCount).toBe(0);
  });

  it('ranks a shared tag above a larger keyword-only overlap', () => {
    const active = makeDoc({
      id: 'active',
      title: 'Sprint Planning',
      content: '<p>backlog grooming velocity</p>',
      tags: ['sprint'],
    });
    const docs = [
      active,
      makeDoc({
        id: 'many-keywords',
        title: 'Sprint Retro',
        content: '<p>backlog grooming velocity notes extra words</p>',
      }),
      makeDoc({
        id: 'tag-match',
        title: 'Unrelated',
        content: '<p>nothing shared here</p>',
        tags: ['sprint'],
      }),
    ];

    const results = findRelatedDocuments(docs, active);

    expect(results[0].document.id).toBe('tag-match');
  });

  it('matches tags case-insensitively and ignores blank tags', () => {
    const active = makeDoc({ id: 'active', title: 'Notes', content: '<p>notes</p>', tags: [' Work ', ''] });
    const docs = [active, makeDoc({ id: 'other', title: 'Other', content: '<p>different</p>', tags: ['work'] })];

    const results = findRelatedDocuments(docs, active);

    expect(results.map((r) => r.document.id)).toEqual(['other']);
    expect(results[0].sharedTagCount).toBe(1);
  });
});

describe('splitTopSuggestion', () => {
  function makeResult(id: string): RelatedDocumentResult {
    return { document: makeDoc({ id }), sharedKeywordCount: 1, sharedTagCount: 0 };
  }

  it('returns a null suggestion and an empty others list for an empty input', () => {
    expect(splitTopSuggestion([])).toEqual({ suggested: null, others: [] });
  });

  it('returns the single result as the suggestion with no others', () => {
    const only = makeResult('only');

    expect(splitTopSuggestion([only])).toEqual({ suggested: only, others: [] });
  });

  it('splits the first (highest-ranked) result out from the rest, preserving order', () => {
    const first = makeResult('first');
    const second = makeResult('second');
    const third = makeResult('third');

    expect(splitTopSuggestion([first, second, third])).toEqual({
      suggested: first,
      others: [second, third],
    });
  });
});
