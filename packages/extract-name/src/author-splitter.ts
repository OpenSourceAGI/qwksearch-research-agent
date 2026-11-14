/**
 * Safely partitions a comprehensive author byline into discrete individual names.
 * Applies sophisticated token replacement and pattern recognition to discern standard splits.
 *
 * @param {string} authorString - The source byline string (e.g., "John Doe, Jane Smith, and Alex Jones").
 * @returns {string[]} An array containing individual un-parsed author name segments.
 */
export function splitMultipleAuthors(authorString: string): string[] {
  if (!authorString) return [];

  let normalized = authorString.replace(/\s+et\s+al\.?/gi, "");

  // Pattern A: Last, First & Last, First Formats
  if (/\w+,\s*\w+\s*&\s*\w+,\s*\w+/.test(normalized)) {
    return normalized.split(/\s*&\s*/).filter(Boolean);
  }

  // Pattern B: Mixed comma + "and" series
  if (
    /\w+,\s*\w+,\s*\w+,\s*\w+/.test(normalized) ||
    /\w+\s\w+,\s\w+\s\w+/.test(normalized)
  ) {
    normalized = normalized.replace(/,\s*(and|&)\s*(?=[^,]*$)/i, " & ");
    return normalized
      .split(/\s*(?:,|&)\s*(?=[^,]*(?:,|$))/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Pattern C: Standard "and" / "&" conjunction block
  if (/\w+\s\w+\s+(and|&)\s+\w+\s\w+/i.test(normalized)) {
    return normalized
      .split(/\s+(?:and|&)\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Fallback broad delimiter standardisation
  normalized = normalized
    .replace(/\s+and\s+/gi, " & ")
    // Break on semi-colons and commas not enclosed by parenthesis blocks (e.g., degrees parsing fallback).
    .replace(/\s*[,;]\s*(?![^(]*\))/g, " & ");

  return normalized.split(/\s*&\s*/).filter((a) => a.trim().length > 0);
}
