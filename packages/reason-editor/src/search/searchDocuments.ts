/**
 * @module searchDocuments
 * @description Cross-document full-text search used by {@link SearchModal}'s
 * spotlight results. Matches are found against each document's plain-text
 * content — `Document.content` is serialised HTML, so searching or
 * previewing the raw markup directly would both miscount matches that only
 * occur inside tags/attributes and leak tag soup into the preview snippet.
 */
import type { Document } from 'react-reason-editor-sidebar';

/** A document match returned by {@link searchDocuments}. */
export interface DocumentSearchResult {
  /** The matched document. */
  document: Document;
  /** Whether the match was found in the title or in the body content. */
  matchType: 'title' | 'content';
  /** Snippet of surrounding plain-text content shown below the title. */
  preview?: string;
  /** Number of times the query occurs in the document's plain-text content. */
  matchCount: number;
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const CONTEXT_RADIUS = 40;
const TITLE_PREVIEW_LENGTH = 120;

/** Strips HTML tags and decodes common entities down to plain, searchable text. */
export function stripHtmlToText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, ' ');
  const withoutEntities = withoutTags.replace(
    /&(?:amp|lt|gt|quot|#39|nbsp);/g,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
  return withoutEntities.replace(/\s+/g, ' ').trim();
}

/** Counts non-overlapping occurrences of `needle` in `haystack`. Both must already be lower-cased. */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;

  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * Searches document titles and plain-text content for `query`, returning one
 * result per matching document (title matches take priority over content
 * matches, mirroring the original spotlight behaviour).
 */
export function searchDocuments(documents: Document[], query: string): DocumentSearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const lowerQuery = trimmedQuery.toLowerCase();
  const results: DocumentSearchResult[] = [];

  for (const doc of documents) {
    const plainText = stripHtmlToText(doc.content);
    const lowerText = plainText.toLowerCase();
    const matchCount = countOccurrences(lowerText, lowerQuery);
    const titleMatch = doc.title.toLowerCase().includes(lowerQuery);

    if (titleMatch) {
      results.push({
        document: doc,
        matchType: 'title',
        matchCount,
        preview: plainText
          ? plainText.slice(0, TITLE_PREVIEW_LENGTH) + (plainText.length > TITLE_PREVIEW_LENGTH ? '...' : '')
          : undefined,
      });
      continue;
    }

    if (matchCount > 0) {
      const matchIndex = lowerText.indexOf(lowerQuery);
      const start = Math.max(0, matchIndex - CONTEXT_RADIUS);
      const end = Math.min(plainText.length, matchIndex + trimmedQuery.length + CONTEXT_RADIUS);

      results.push({
        document: doc,
        matchType: 'content',
        matchCount,
        preview: (start > 0 ? '...' : '') + plainText.slice(start, end) + (end < plainText.length ? '...' : ''),
      });
    }
  }

  return results;
}
