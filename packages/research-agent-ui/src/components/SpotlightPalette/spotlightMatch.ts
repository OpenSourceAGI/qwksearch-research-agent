/**
 * @fileoverview Spotlight palette matching — the prefix system and the ranker.
 *
 * Ported from the CardMirror editor's quick-card search palette in debate-ai
 * (`packages/debate-editor/src/editor/quick-cards-match.ts`, plus the prefix
 * parser in `quick-card-search-ui.ts`), because the two palettes want exactly
 * the same behaviour: order-independent multi-token substring AND-matching in
 * two tiers — entries whose NAME matches come first, then entries that match
 * only on their secondary text, carrying a small snippet of the matched
 * region so it is obvious *why* a row is in the list.
 *
 * Deliberately substring matching, not edit-distance fuzz: a chat titled
 * "Solid-state battery breakthroughs" surfacing for "sled" is noise, and the
 * palette's whole job is to be predictable enough to use blind.
 */

/**
 * A single-letter prefix scoping the query to one source, typed as
 * `<letter><space>`. With a prefix present an empty query *browses* that
 * source; with no prefix the palette searches everything.
 */
export type SpotlightPrefix = 'c' | 't' | 's' | 'a' | 'w' | null;

/** The kind of thing a palette row points at. */
export type SpotlightSource = 'chat' | 'page' | 'setting' | 'action' | 'search';

/** Prefix → the source it scopes to, with the hint shown under the bar. */
export const SPOTLIGHT_PREFIXES: ReadonlyArray<{
  prefix: Exclude<SpotlightPrefix, null>;
  source: SpotlightSource;
  label: string;
}> = [
  { prefix: 'c', source: 'chat', label: 'chats' },
  { prefix: 't', source: 'page', label: 'pages' },
  { prefix: 's', source: 'setting', label: 'settings' },
  { prefix: 'a', source: 'action', label: 'actions' },
  { prefix: 'w', source: 'search', label: 'web' },
];

/** Split a leading single-letter prefix (`c `/`t `/`s `/`a `/`w `) off the query. */
export function parsePrefix(raw: string): { prefix: SpotlightPrefix; query: string } {
  const m = raw.match(/^([a-zA-Z])\s+(.*)$/);
  if (m) {
    const p = m[1]!.toLowerCase();
    const known = SPOTLIGHT_PREFIXES.find((e) => e.prefix === p);
    if (known) return { prefix: known.prefix, query: m[2]! };
  }
  return { prefix: null, query: raw };
}

/** The prefix that scopes to a given source, for Tab-cycling the bar. */
export function prefixForSource(source: SpotlightSource): Exclude<SpotlightPrefix, null> {
  return SPOTLIGHT_PREFIXES.find((e) => e.source === source)!.prefix;
}

/** The minimum shape the ranker needs: a name, plus optional secondary text. */
export interface SpotlightMatchable {
  /** The row's title — the first-tier match target. */
  name: string;
  /** Shown under the name; searched in the second tier. */
  meta?: string;
  /** Extra searchable text that is never displayed (aliases, synonyms). */
  keywords?: string;
}

export interface SpotlightMatch<T extends SpotlightMatchable> {
  item: T;
  /** True when the query matched the name; false = secondary-text-only match,
   *  in which case `snippet` shows the matched region. */
  matchedName: boolean;
  snippet: string | null;
}

/** Chars of context on each side of a secondary-text match (~40 total). */
const SNIPPET_RADIUS = 18;

/** Everything searchable about an item apart from its name. */
function secondaryText(item: SpotlightMatchable): string {
  return `${item.meta ?? ''} ${item.keywords ?? ''}`.toLowerCase();
}

/**
 * Ranks `items` against `query`.
 *
 * An empty query browses: every item, in the order given (builders already
 * order their own source — recent chats by recency, pages by the curated
 * list). A non-empty query keeps only items where EVERY whitespace-separated
 * token appears somewhere, name matches first.
 */
export function matchSpotlight<T extends SpotlightMatchable>(
  items: readonly T[],
  query: string,
): SpotlightMatch<T>[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0)
    return items.map((item) => ({ item, matchedName: true, snippet: null }));

  const nameMatches: T[] = [];
  const secondaryMatches: T[] = [];
  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    if (tokens.every((t) => nameLower.includes(t))) nameMatches.push(item);
    else {
      const rest = `${nameLower} ${secondaryText(item)}`;
      if (tokens.every((t) => rest.includes(t))) secondaryMatches.push(item);
    }
  }

  const t0 = tokens[0]!;
  // Name tier: earliest first-token position wins, so prefix matches float to
  // the top ("set" puts "Settings" above "Reset chat"). `sort` is stable, so
  // ties keep the builder's order.
  nameMatches.sort((a, b) => a.name.toLowerCase().indexOf(t0) - b.name.toLowerCase().indexOf(t0));

  return [
    ...nameMatches.map((item) => ({ item, matchedName: true, snippet: null as string | null })),
    ...secondaryMatches.map((item) => ({
      item,
      matchedName: false,
      snippet: makeSnippet(secondaryText(item), t0),
    })),
  ];
}

/** A trimmed, ellipsized window of `textLower` around the first `token` hit. */
export function makeSnippet(textLower: string, token: string): string {
  const i = textLower.indexOf(token);
  if (i < 0) return '';
  const start = Math.max(0, i - SNIPPET_RADIUS);
  const end = Math.min(textLower.length, i + token.length + SNIPPET_RADIUS);
  let s = textLower.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = '…' + s;
  if (end < textLower.length) s = s + '…';
  return s;
}
