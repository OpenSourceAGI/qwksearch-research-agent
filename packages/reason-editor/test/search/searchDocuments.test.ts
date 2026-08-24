/**
 * Regression coverage for the cross-document spotlight search (SearchModal).
 * `Document.content` is serialised HTML, so these tests pin down that
 * matches/counts are computed against the plain-text rendering rather than
 * the raw markup, and that previews never leak tags into the UI.
 */
import { describe, expect, it } from 'vitest';

import type { Document } from '@/documents/DocumentTree';
import { searchDocuments, stripHtmlToText } from '@/search/searchDocuments';

function makeDoc(overrides: Partial<Document> & { id: string }): Document {
  return {
    title: 'Untitled',
    content: '',
    parentId: null,
    ...overrides,
  };
}

describe('stripHtmlToText', () => {
  it('removes tags and decodes common entities', () => {
    expect(stripHtmlToText('<p>Hello <strong>world</strong> &amp; friends</p>')).toBe('Hello world & friends');
  });

  it('collapses whitespace left behind by removed tags', () => {
    expect(stripHtmlToText('<div>a</div><div>b</div>')).toBe('a b');
  });
});

describe('searchDocuments', () => {
  it('returns no results for an empty or whitespace-only query', () => {
    const docs = [makeDoc({ id: '1', title: 'Recipes', content: '<p>Pasta</p>' })];

    expect(searchDocuments(docs, '')).toEqual([]);
    expect(searchDocuments(docs, '   ')).toEqual([]);
  });

  it('matches case-insensitively against the title', () => {
    const docs = [makeDoc({ id: '1', title: 'Weekly Recipes', content: '<p>nothing relevant</p>' })];

    const results = searchDocuments(docs, 'recipes');

    expect(results).toHaveLength(1);
    expect(results[0].matchType).toBe('title');
    expect(results[0].document.id).toBe('1');
  });

  it('matches against plain text and excludes matches that only occur inside markup', () => {
    // The literal string "div" only appears inside a tag, not in visible text.
    const docs = [makeDoc({ id: '1', title: 'Layout notes', content: '<div>Just a paragraph</div>' })];

    expect(searchDocuments(docs, 'div')).toEqual([]);
  });

  it('builds a preview snippet with no HTML markup', () => {
    const docs = [
      makeDoc({
        id: '1',
        title: 'Untitled',
        content: '<p>The quick <strong>brown fox</strong> jumps over the lazy dog</p>',
      }),
    ];

    const [result] = searchDocuments(docs, 'brown fox');

    expect(result.matchType).toBe('content');
    expect(result.preview).toBeDefined();
    expect(result.preview).not.toMatch(/<[^>]*>/);
    expect(result.preview).toContain('brown fox');
  });

  it('counts every non-overlapping occurrence of the query in the content', () => {
    const docs = [makeDoc({ id: '1', title: 'Untitled', content: '<p>cat cat CAT catcat</p>' })];

    const [result] = searchDocuments(docs, 'cat');

    // "cat cat CAT catcat" -> 5 non-overlapping occurrences of "cat".
    expect(result.matchCount).toBe(5);
  });

  it('prefers a title match over a content match for the same document', () => {
    const docs = [makeDoc({ id: '1', title: 'Budget plan', content: '<p>mentions budget twice: budget</p>' })];

    const [result] = searchDocuments(docs, 'budget');

    expect(result.matchType).toBe('title');
  });

  it('omits documents with no match in the title or content', () => {
    const docs = [makeDoc({ id: '1', title: 'Groceries', content: '<p>Milk, eggs, bread</p>' })];

    expect(searchDocuments(docs, 'astrophysics')).toEqual([]);
  });

  it('returns one result per matching document across a mixed set', () => {
    const docs = [
      makeDoc({ id: '1', title: 'Sprint planning', content: '<p>backlog grooming</p>' }),
      makeDoc({ id: '2', title: 'Groceries', content: '<p>milk, eggs</p>' }),
      makeDoc({ id: '3', title: 'Retro notes', content: '<p>What went well: sprint velocity</p>' }),
    ];

    const results = searchDocuments(docs, 'sprint');

    expect(results.map((r) => r.document.id).sort()).toEqual(['1', '3']);
  });
});
