/**
 * @module findReplaceAllDocs
 * @description Pure helpers for finding and replacing text across every
 * document in the workspace, as opposed to the single-document Find & Replace
 * extension (`extensions/SearchAndReplace`) which only operates on the
 * document currently loaded into the Tiptap editor.
 */
import type { Document } from '../documents/DocumentTree';

/** Options shared by {@link searchAllDocuments} and {@link replaceInAllDocuments}. */
export interface FindReplaceOptions {
  /** When `true`, matching is case-sensitive. Defaults to `false`. */
  caseSensitive?: boolean;
}

/** A single document's match summary for a cross-document search. */
export interface DocumentMatch {
  documentId: string;
  title: string;
  matchCount: number;
  /** Context around the first match, truncated with `...` when clipped. */
  snippet: string;
}

/** Result of a cross-document replace-all operation. */
export interface ReplaceAllResult {
  /** The full document list with matching documents replaced in place. */
  documents: Document[];
  /** IDs of documents whose content actually changed. */
  changedIds: string[];
  /** Total number of individual occurrences replaced across all documents. */
  replacedCount: number;
}

const SNIPPET_RADIUS = 40;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Folders and deleted documents have no searchable body content. */
function isSearchable(doc: Document): boolean {
  return !doc.isFolder && !doc.isDeleted;
}

function buildMatcher(query: string, options: FindReplaceOptions): RegExp {
  return new RegExp(escapeRegExp(query), options.caseSensitive ? 'g' : 'gi');
}

/**
 * Searches every searchable document's content for `query`, reporting a match
 * count and a context snippet per matching document. Returns `[]` for a blank
 * query.
 */
export function searchAllDocuments(
  documents: Document[],
  query: string,
  options: FindReplaceOptions = {}
): DocumentMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matcher = buildMatcher(trimmed, options);
  const results: DocumentMatch[] = [];

  for (const doc of documents) {
    if (!isSearchable(doc)) continue;

    const content = doc.content || '';
    const matches = content.match(matcher);
    if (!matches || matches.length === 0) continue;

    const matchIndex = content.search(matcher);
    const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
    const end = Math.min(content.length, matchIndex + trimmed.length + SNIPPET_RADIUS);
    const snippet =
      (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');

    results.push({
      documentId: doc.id,
      title: doc.title || 'Untitled',
      matchCount: matches.length,
      snippet,
    });
  }

  return results;
}

/**
 * Replaces every occurrence of `query` with `replacement` across all
 * searchable documents, skipping any document whose ID is in
 * `options.excludeIds` (used to skip the document currently open in the
 * editor, whose in-memory Tiptap state would otherwise silently overwrite the
 * replacement on its next autosave). Documents with no match are returned
 * by reference, unchanged. A blank query is a no-op.
 */
export function replaceInAllDocuments(
  documents: Document[],
  query: string,
  replacement: string,
  options: FindReplaceOptions & { excludeIds?: string[] } = {}
): ReplaceAllResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { documents, changedIds: [], replacedCount: 0 };
  }

  const excludeIds = new Set(options.excludeIds ?? []);
  const matcher = buildMatcher(trimmed, options);
  const changedIds: string[] = [];
  let replacedCount = 0;

  const nextDocuments = documents.map((doc) => {
    if (!isSearchable(doc) || excludeIds.has(doc.id)) return doc;

    const content = doc.content || '';
    const matches = content.match(matcher);
    if (!matches || matches.length === 0) return doc;

    replacedCount += matches.length;
    changedIds.push(doc.id);
    // Replace via a function so `replacement` is inserted literally, never
    // interpreted as a `$&`/`$1`-style substitution pattern.
    return { ...doc, content: content.replace(matcher, () => replacement) };
  });

  return { documents: nextDocuments, changedIds, replacedCount };
}
