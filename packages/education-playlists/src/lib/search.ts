/**
 * @fileoverview Keyword search over catalog items. It is what the planner
 * runs its searches against when no web search is wired in, and what keeps a
 * custom playlist anchored to known courses when one is.
 */
import type { PlaylistItem } from '../types';

const STOP_WORDS = new Set(
  'a an and are as at be by for from how i in into is it learn learning me my of on or the to want what with about understand study become get better'.split(' '),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ''))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/** Items ranked by how many query terms they mention; title hits count double. */
export function searchCatalog(items: PlaylistItem[], query: string, limit = 10): PlaylistItem[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  return items
    .map((item, order) => {
      const title = item.title.toLowerCase();
      const body = `${item.description ?? ''} ${item.courseNumber ?? ''}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 2;
        else if (body.includes(term)) score += 1;
      }
      return { item, score, order };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.item);
}
