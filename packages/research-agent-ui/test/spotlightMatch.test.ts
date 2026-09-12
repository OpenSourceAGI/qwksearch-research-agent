/**
 * @fileoverview The spotlight palette's prefix parser and ranker — the two
 * pieces that decide what the Ctrl-Space bar shows and in what order.
 */
import { describe, expect, it } from 'vitest';
import {
  makeSnippet,
  matchSpotlight,
  parsePrefix,
  prefixForSource,
  SPOTLIGHT_PREFIXES,
} from '../src/components/SpotlightPalette/spotlightMatch';

const items = [
  { name: 'Settings', meta: 'Models, connectors and preferences' },
  { name: 'Reset chat', meta: 'Clear the conversation' },
  { name: 'Library', meta: 'Saved chats and uploads', keywords: 'archive history' },
];

describe('parsePrefix', () => {
  it('splits a known single-letter prefix off the query', () => {
    expect(parsePrefix('c batteries')).toEqual({ prefix: 'c', query: 'batteries' });
    expect(parsePrefix('S models')).toEqual({ prefix: 's', query: 'models' });
  });

  it('treats an unknown letter as part of the query', () => {
    expect(parsePrefix('x batteries')).toEqual({ prefix: null, query: 'x batteries' });
  });

  it('keeps a bare prefix letter with no trailing space as a query', () => {
    // Otherwise typing the first letter of a word would silently scope the
    // search before the user has finished the word.
    expect(parsePrefix('c')).toEqual({ prefix: null, query: 'c' });
  });

  it('browses a source when the prefix is followed by nothing', () => {
    expect(parsePrefix('c ')).toEqual({ prefix: 'c', query: '' });
  });

  it('maps every source to exactly one prefix', () => {
    for (const entry of SPOTLIGHT_PREFIXES) {
      expect(prefixForSource(entry.source)).toBe(entry.prefix);
    }
  });
});

describe('matchSpotlight', () => {
  it('browses everything, in the given order, for an empty query', () => {
    const results = matchSpotlight(items, '');

    expect(results.map((r) => r.item.name)).toEqual(['Settings', 'Reset chat', 'Library']);
    expect(results.every((r) => r.matchedName)).toBe(true);
  });

  it('ranks name matches above secondary-text matches', () => {
    const results = matchSpotlight(items, 'chat');

    expect(results.map((r) => r.item.name)).toEqual(['Reset chat', 'Library']);
    expect(results[0].matchedName).toBe(true);
    expect(results[1].matchedName).toBe(false);
    expect(results[1].snippet).toContain('chat');
  });

  it('floats earlier name hits up within the name tier', () => {
    const results = matchSpotlight(items, 'set');

    expect(results.map((r) => r.item.name)).toEqual(['Settings', 'Reset chat']);
  });

  it('requires every token but ignores their order', () => {
    expect(matchSpotlight(items, 'chat reset').map((r) => r.item.name)).toEqual(['Reset chat']);
    expect(matchSpotlight(items, 'reset chat').map((r) => r.item.name)).toEqual(['Reset chat']);
    expect(matchSpotlight(items, 'reset library')).toEqual([]);
  });

  it('matches undisplayed keywords', () => {
    expect(matchSpotlight(items, 'archive').map((r) => r.item.name)).toEqual(['Library']);
  });

  it('does not fuzzy-match across a typo', () => {
    // Substring matching on purpose: near-miss rows make the list unusable
    // blind, which is the whole point of a keyboard palette.
    expect(matchSpotlight(items, 'libary')).toEqual([]);
  });
});

describe('makeSnippet', () => {
  it('windows and ellipsizes around the first hit', () => {
    const text = 'a'.repeat(60) + ' needle ' + 'b'.repeat(60);
    const snippet = makeSnippet(text, 'needle');

    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).toContain('needle');
    expect(snippet.length).toBeLessThan(text.length);
  });

  it('is empty when the token is absent', () => {
    expect(makeSnippet('nothing here', 'needle')).toBe('');
  });
});
