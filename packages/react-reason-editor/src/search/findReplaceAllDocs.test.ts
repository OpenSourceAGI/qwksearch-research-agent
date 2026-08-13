import { describe, it, expect } from 'vitest';
import { searchAllDocuments, replaceInAllDocuments } from './findReplaceAllDocs';
import type { Document } from '../documents/DocumentTree';

function makeDoc(overrides: Partial<Document> & { id: string }): Document {
  return {
    title: 'Untitled',
    content: '',
    parentId: null,
    children: [],
    isExpanded: false,
    ...overrides,
  } as Document;
}

const documents: Document[] = [
  makeDoc({ id: 'a', title: 'Alpha Notes', content: 'The quick brown fox jumps over the lazy fox.' }),
  makeDoc({ id: 'b', title: 'Beta Notes', content: 'No matches here.' }),
  makeDoc({ id: 'c', title: 'FOX file', content: 'A single Fox appears once.' }),
  makeDoc({ id: 'folder', title: 'A Folder', content: 'fox', isFolder: true }),
  makeDoc({ id: 'deleted', title: 'Trashed', content: 'fox', isDeleted: true }),
];

describe('searchAllDocuments', () => {
  it('returns [] for a blank query', () => {
    expect(searchAllDocuments(documents, '')).toEqual([]);
    expect(searchAllDocuments(documents, '   ')).toEqual([]);
  });

  it('matches case-insensitively by default and counts every occurrence', () => {
    const results = searchAllDocuments(documents, 'fox');

    expect(results.map((r) => r.documentId)).toEqual(['a', 'c']);
    expect(results[0].matchCount).toBe(2);
    expect(results[1].matchCount).toBe(1);
  });

  it('skips folders and deleted documents', () => {
    const results = searchAllDocuments(documents, 'fox');
    expect(results.some((r) => r.documentId === 'folder')).toBe(false);
    expect(results.some((r) => r.documentId === 'deleted')).toBe(false);
  });

  it('respects the caseSensitive option', () => {
    const results = searchAllDocuments(documents, 'Fox', { caseSensitive: true });
    expect(results.map((r) => r.documentId)).toEqual(['c']);
  });

  it('builds a truncated snippet around the first match', () => {
    const long = makeDoc({
      id: 'long',
      title: 'Long doc',
      content: 'x'.repeat(100) + 'NEEDLE' + 'y'.repeat(100),
    });
    const [result] = searchAllDocuments([long], 'NEEDLE');

    expect(result.snippet.startsWith('...')).toBe(true);
    expect(result.snippet.endsWith('...')).toBe(true);
    expect(result.snippet).toContain('NEEDLE');
  });
});

describe('replaceInAllDocuments', () => {
  it('is a no-op for a blank query', () => {
    const result = replaceInAllDocuments(documents, '', 'bar');
    expect(result).toEqual({ documents, changedIds: [], replacedCount: 0 });
  });

  it('replaces every occurrence across all matching documents', () => {
    const result = replaceInAllDocuments(documents, 'fox', 'dog');

    expect(result.changedIds).toEqual(['a', 'c']);
    expect(result.replacedCount).toBe(3);

    const docA = result.documents.find((d) => d.id === 'a')!;
    const docC = result.documents.find((d) => d.id === 'c')!;
    expect(docA.content).toBe('The quick brown dog jumps over the lazy dog.');
    expect(docC.content).toBe('A single dog appears once.');
  });

  it('leaves non-matching documents untouched, by reference', () => {
    const result = replaceInAllDocuments(documents, 'fox', 'dog');
    const docB = result.documents.find((d) => d.id === 'b')!;
    expect(docB).toBe(documents[1]);
  });

  it('does not modify folders or deleted documents even when their content matches', () => {
    const result = replaceInAllDocuments(documents, 'fox', 'dog');
    const folder = result.documents.find((d) => d.id === 'folder')!;
    const deleted = result.documents.find((d) => d.id === 'deleted')!;
    expect(folder.content).toBe('fox');
    expect(deleted.content).toBe('fox');
  });

  it('skips documents listed in excludeIds', () => {
    const result = replaceInAllDocuments(documents, 'fox', 'dog', { excludeIds: ['a'] });

    expect(result.changedIds).toEqual(['c']);
    const docA = result.documents.find((d) => d.id === 'a')!;
    expect(docA).toBe(documents[0]);
  });

  it('respects the caseSensitive option', () => {
    const result = replaceInAllDocuments(documents, 'Fox', 'dog', { caseSensitive: true });
    expect(result.changedIds).toEqual(['c']);
  });

  it('inserts the replacement text literally, even when it looks like a $-substitution pattern', () => {
    const doc = makeDoc({ id: 'price', title: 'Price doc', content: 'Cost: PLACEHOLDER' });
    const result = replaceInAllDocuments([doc], 'PLACEHOLDER', '$100 ($&)');

    expect(result.documents[0].content).toBe('Cost: $100 ($&)');
  });
});
