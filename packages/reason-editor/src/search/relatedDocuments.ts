/**
 * @module relatedDocuments
 * @description Client-side "related documents" suggestions for the sidebar's
 * Related panel. Scores every other document by how many significant
 * keywords it shares with the active document's title and plain-text
 * content — the same plain-text approach {@link searchDocuments} uses, no
 * server calls or embeddings involved — boosted by any shared user-assigned
 * tags, a more deliberate relatedness signal than incidental keyword overlap.
 */
import type { Document } from '../documents/DocumentTree';
import { stripHtmlToText } from './searchDocuments';

/** A related-document suggestion returned by {@link findRelatedDocuments}. */
export interface RelatedDocumentResult {
  /** The related document. */
  document: Document;
  /** Number of significant keywords shared with the active document. */
  sharedKeywordCount: number;
  /** Number of tags shared with the active document (case-insensitive). */
  sharedTagCount: number;
}

const MIN_KEYWORD_LENGTH = 4;
const DEFAULT_LIMIT = 10;
/** Weight applied to each shared tag when ranking, relative to a single shared keyword. */
const TAG_MATCH_WEIGHT = 5;

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

/** Extracts the set of trimmed, lower-cased tags assigned to a document. */
function extractTags(doc: Document): Set<string> {
  const tags = new Set<string>();
  for (const tag of doc.tags ?? []) {
    const normalized = tag.trim().toLowerCase();
    if (normalized) tags.add(normalized);
  }
  return tags;
}

/**
 * Ranks candidate documents by how many significant keywords and tags they
 * share with `activeDocument`. Each shared tag counts as {@link
 * TAG_MATCH_WEIGHT} shared keywords when ranking, since a user-assigned tag
 * is a more deliberate relatedness signal than incidental keyword overlap. A
 * document with no shared keywords but at least one shared tag still
 * qualifies. Folders, soft-deleted documents, and the active document itself
 * are never suggested.
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
  const activeTags = extractTags(activeDocument);
  if (activeKeywords.size === 0 && activeTags.size === 0) return [];

  const results: RelatedDocumentResult[] = [];

  for (const doc of documents) {
    if (doc.id === activeDocument.id || doc.isFolder || doc.isDeleted) continue;

    const docKeywords = extractKeywords(doc);
    let sharedKeywordCount = 0;
    for (const keyword of activeKeywords) {
      if (docKeywords.has(keyword)) sharedKeywordCount++;
    }

    const docTags = extractTags(doc);
    let sharedTagCount = 0;
    for (const tag of activeTags) {
      if (docTags.has(tag)) sharedTagCount++;
    }

    if (sharedKeywordCount > 0 || sharedTagCount > 0) {
      results.push({ document: doc, sharedKeywordCount, sharedTagCount });
    }
  }

  results.sort((a, b) => {
    const scoreA = a.sharedKeywordCount + a.sharedTagCount * TAG_MATCH_WEIGHT;
    const scoreB = b.sharedKeywordCount + b.sharedTagCount * TAG_MATCH_WEIGHT;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.document.title.localeCompare(b.document.title);
  });

  return results.slice(0, limit);
}

/** The single top-ranked suggestion, split from the rest, returned by {@link splitTopSuggestion}. */
export interface RelatedDocumentsSplit {
  /** The highest-ranked related document, or `null` when there are no results. */
  suggested: RelatedDocumentResult | null;
  /** The remaining results, in their existing rank order. */
  others: RelatedDocumentResult[];
}

/**
 * Splits an already-ranked {@link findRelatedDocuments} result list into its
 * single top match — the "suggested next" document — and the rest, so the
 * sidebar can render the top match more prominently than the flat list.
 */
export function splitTopSuggestion(results: RelatedDocumentResult[]): RelatedDocumentsSplit {
  if (results.length === 0) return { suggested: null, others: [] };
  const [suggested, ...others] = results;
  return { suggested, others };
}
