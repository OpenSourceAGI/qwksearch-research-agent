/**
 * @fileoverview Fuzzy matching, ranking and highlighting for the slash menu.
 *
 * Subsequence matching ("gg" finds "debuGGing"), scored so contiguous runs,
 * word starts and early matches rank first. Names outrank descriptions.
 */

export interface FuzzyResult {
  /** Higher is better. */
  score: number;
  /** Indices in the text of the matched characters, ascending. */
  indices: number[];
}

const BOUNDARY = /[\s\-_./:]/;

/**
 * Matches `query` as a case-insensitive subsequence of `text`.
 *
 * A forward pass finds the earliest end of a match and a backward pass
 * tightens its start, so the highlighted letters hug each other instead of
 * being scattered across the whole string.
 *
 * @param maxSpan - Reject matches whose first and last matched letters are
 *   further apart than this, which keeps long prose from matching on letters
 *   scattered across the whole sentence.
 * @returns Score and matched indices, or `null` when the letters are not all
 *   present in order. An empty query matches everything with score 0.
 */
export function fuzzyMatch(query: string, text: string, maxSpan = Infinity): FuzzyResult | null {
  const q = query.toLowerCase();
  if (q === '') return { score: 0, indices: [] };
  const t = text.toLowerCase();

  let qi = 0;
  let end = -1;
  for (let ti = 0; ti < t.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      if (qi === q.length) {
        end = ti;
        break;
      }
    }
  }
  if (end < 0) return null;

  const indices: number[] = [];
  qi = q.length - 1;
  for (let ti = end; ti >= 0 && qi >= 0; ti--) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      qi--;
    }
  }
  indices.reverse();
  if (indices[indices.length - 1]! - indices[0]! + 1 > maxSpan) return null;

  let score = 0;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k]!;
    score += 1;
    if (k > 0 && indices[k - 1] === i - 1) score += 4;
    if (i === 0) score += 6;
    else if (BOUNDARY.test(text[i - 1]!)) score += 3;
  }
  score -= (indices[0]! * 0.2) + t.length * 0.01;
  return { score, indices };
}

/** Anything the menu can rank: a name plus optional secondary text. */
export interface SlashMatchable {
  name: string;
  description?: string;
  /** Extra searchable text that is never shown (aliases, extensions). */
  keywords?: string;
}

export interface SlashRanked<T extends SlashMatchable> {
  item: T;
  score: number;
  /** Matched character positions in `item.name`. */
  nameIndices: number[];
  /** Matched character positions in `item.description`. */
  descriptionIndices: number[];
}

/** Longest stretch a query may span in secondary text (descriptions, keywords). */
const secondarySpan = (query: string) => query.length + 2;

/** A name hit is worth this many description hits. */
const NAME_WEIGHT = 3;

/**
 * Filters and ranks `items` against `query`, best match first.
 *
 * An empty query returns everything in the given order. Ties keep the
 * registry order (the sort is stable), so commands stay ahead of files that
 * score the same.
 */
export function rankSlashItems<T extends SlashMatchable>(
  items: readonly T[],
  query: string,
): SlashRanked<T>[] {
  if (query === '') {
    return items.map((item) => ({ item, score: 0, nameIndices: [], descriptionIndices: [] }));
  }
  const out: SlashRanked<T>[] = [];
  for (const item of items) {
    const name = fuzzyMatch(query, item.name);
    const description = item.description ? fuzzyMatch(query, item.description, secondarySpan(query)) : null;
    const keywords = item.keywords ? fuzzyMatch(query, item.keywords, secondarySpan(query)) : null;
    if (!name && !description && !keywords) continue;
    const score = Math.max(
      name ? name.score * NAME_WEIGHT + 20 : -Infinity,
      description ? description.score : -Infinity,
      keywords ? keywords.score * 0.5 : -Infinity,
    );
    out.push({
      item,
      score,
      nameIndices: name?.indices ?? [],
      descriptionIndices: description?.indices ?? [],
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** A run of text and whether it is a matched (highlighted) run. */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Splits `text` into alternating plain/matched runs for rendering. */
export function highlightSegments(text: string, indices: readonly number[]): HighlightSegment[] {
  if (indices.length === 0) return [{ text, match: false }];
  const hit = new Set(indices);
  const segments: HighlightSegment[] = [];
  for (let i = 0; i < text.length; i++) {
    const match = hit.has(i);
    const last = segments[segments.length - 1];
    if (last && last.match === match) last.text += text[i];
    else segments.push({ text: text[i]!, match });
  }
  return segments;
}

/**
 * Trims a long description so its first match is visible in a one-line row,
 * prefixing an ellipsis. Indices are shifted to stay aligned with the result.
 */
export function windowDescription(
  text: string,
  indices: readonly number[],
  lead = 24,
): { text: string; indices: number[] } {
  const first = indices[0];
  if (first === undefined || first <= lead) return { text, indices: [...indices] };
  const start = first - lead;
  return { text: `…${text.slice(start)}`, indices: indices.map((i) => i - start + 1) };
}

/**
 * Splits ranked rows into one section per kind, so the menu can show group
 * headings while keyboard order still matches what is on screen.
 *
 * Within a section rows keep their rank. Sections are ordered by their best
 * row, so a query that mostly hits files lifts the Files section above
 * Commands. Ties (and the empty query) put `order[0]` first.
 */
export function groupRanked<T extends SlashMatchable & { kind: string }>(
  ranked: readonly SlashRanked<T>[],
  order: readonly string[],
): { kind: string; rows: SlashRanked<T>[] }[] {
  const byKind = new Map<string, SlashRanked<T>[]>();
  for (const row of ranked) {
    const list = byKind.get(row.item.kind);
    if (list) list.push(row);
    else byKind.set(row.item.kind, [row]);
  }
  const rank = (kind: string) => {
    const at = order.indexOf(kind);
    return at < 0 ? order.length : at;
  };
  return [...byKind.entries()]
    .map(([kind, rows]) => ({ kind, rows }))
    .sort((a, b) => b.rows[0]!.score - a.rows[0]!.score || rank(a.kind) - rank(b.kind));
}
