/**
 * @module relatedDocuments
 * @description Client-side "related documents" suggestions for the sidebar's
 * Related panel. Scores every other document by how many significant
 * keywords it shares with the active document's title and plain-text
 * content — the same plain-text approach {@link searchDocuments} uses, no
 * server calls or embeddings involved.
 */
import type { Document } from '../documents/DocumentTree';
import { stripHtmlToText } from './searchDocuments';

/** A related-document suggestion returned by {@link findRelatedDocuments}. */
export interface RelatedDocumentResult {
  /** The related document. */
  document: Document;
  /** Number of significant keywords shared with the active document. */
  sharedKeywordCount: number;
}

const MIN_KEYWORD_LENGTH = 4;
const DEFAULT_LIMIT = 10;

/** Common English words excluded from keyword extraction as too generic to signal relevance. */
const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'along', 'also', 'always',
  'among', 'around', 'because', 'before', 'below', 'between', 'both',
  'cannot', 'could', 'does', 'doing', 'down', 'during', 'each', 'either',
  'every', 'first', 'from', 'further', 'have', 'having', 'here', 'into',
  'just', 'more', 'most', 'once', 'only', 'other', 'over', 'same', 'shall',
  'should', 'since', 'some', 'such', 'than', 'that', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under',
  'until', 'very', 'were', 'what', 'when', 'where', 'which', 'while',
  'will', 'with', 'would', 'your',
]);

/** Extracts the set of lower-cased, stopword-filtered significant keywords from a document. */
function extractKeywords(doc: Document): Set<string> {
  const text = `${doc.title} ${stripHtmlToText(doc.content)}`.toLowerCase();
  const words = text.match(/[a-z0-9]+/g) ?? [];
  const keywords = new Set<string>();
  for (const word of words) {
    if (word.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(word)) {
      keywords.add(word);
    }
  }
  return keywords;
}

/**
 * Ranks candidate documents by how many significant keywords they share with
 * `activeDocument`'s title and content. Folders, soft-deleted documents, and
 * the active document itself are never suggested.
 *
 * @param documents - Candidate documents to search (typically all documents).
 * @param activeDocument - The currently open document, or `undefined`/`null` when none is active.
 * @param limit - Maximum number of suggestions to return (default 10).
 */
export function findRelatedDocuments(
  documents: Document[],
  activeDocument: Document | undefined | null,
  limit: number = DEFAULT_LIMIT,
): RelatedDocumentResult[] {
  if (!activeDocument) return [];

  const activeKeywords = extractKeywords(activeDocument);
  if (activeKeywords.size === 0) return [];

  const results: RelatedDocumentResult[] = [];

  for (const doc of documents) {
    if (doc.id === activeDocument.id || doc.isFolder || doc.isDeleted) continue;

    const docKeywords = extractKeywords(doc);
    let sharedKeywordCount = 0;
    for (const keyword of activeKeywords) {
      if (docKeywords.has(keyword)) sharedKeywordCount++;
    }

    if (sharedKeywordCount > 0) {
      results.push({ document: doc, sharedKeywordCount });
    }
  }

  results.sort((a, b) => {
    if (b.sharedKeywordCount !== a.sharedKeywordCount) {
      return b.sharedKeywordCount - a.sharedKeywordCount;
    }
    return a.document.title.localeCompare(b.document.title);
  });

  return results.slice(0, limit);
}
