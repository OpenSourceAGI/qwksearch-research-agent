/**
 * @module research/search/document
 * @description Minimal document shape shared across the search pipeline.
 * A document is a chunk of page content plus citation metadata (title, url, source, etc.).
 */

export interface Document<
  Metadata extends Record<string, any> = Record<string, any>,
> {
  pageContent: string;
  metadata: Metadata;
}

/**
 * Splits text into overlapping chunks on whitespace boundaries.
 * Default chunkSize 1000, chunkOverlap 200.
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize = 1000,
  chunkOverlap = 200,
): string[] {
  const trimmed = (text || "").trim();
  if (trimmed.length <= chunkSize) {
    return trimmed.length > 0 ? [trimmed] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + chunkSize, trimmed.length);

    // Break on the last whitespace inside the window so words stay intact
    if (end < trimmed.length) {
      const lastSpace = trimmed.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }

    chunks.push(trimmed.slice(start, end).trim());

    if (end >= trimmed.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
