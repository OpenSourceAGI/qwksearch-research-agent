import { describe, expect, it } from 'vitest';
import findInTabContent from '../lib/find-in-tab-content';

const TAB = {
  tabId: 7,
  title: 'Espresso Brewing Guide',
  favIconUrl: 'https://example.com/favicon.ico',
  content: '<p>Pull a shot of espresso using nine bars of pressure.</p>',
};

describe('findInTabContent', () => {
  it('returns a match when every search word is present', () => {
    const result = findInTabContent(TAB, 'espresso pressure');

    expect(result).toBeDefined();
    expect(result!.id).toBe(7);
    expect(result!.favIconUrl).toBe('https://example.com/favicon.ico');
  });

  it('returns undefined when one of the words is missing', () => {
    expect(findInTabContent(TAB, 'espresso kombucha')).toBeUndefined();
  });

  it('returns undefined when the query has no usable words', () => {
    // Words of one character or shorter are filtered out entirely.
    expect(findInTabContent(TAB, '')).toBeUndefined();
    expect(findInTabContent(TAB, '  ')).toBeUndefined();
    expect(findInTabContent(TAB, 'a b')).toBeUndefined();
  });

  it('matches case-insensitively', () => {
    expect(findInTabContent(TAB, 'ESPRESSO')).toBeDefined();
  });

  it('searches the title as well as the body', () => {
    const result = findInTabContent(TAB, 'brewing');

    expect(result).toBeDefined();
  });

  it('reports the last search word', () => {
    expect(findInTabContent(TAB, 'espresso pressure')!.lastSearchWord).toBe('pressure');
  });

  it('bolds the matched term, preserving the casing found in the page', () => {
    const result = findInTabContent(TAB, 'espresso');

    // The match is case-insensitive but the snippet keeps the original text,
    // and the title is searched first, so the title's capital E wins.
    expect(result!.dispString).toContain('<b>Espresso</b>');
  });

  it('strips HTML tags out of the snippet', () => {
    const result = findInTabContent(TAB, 'espresso');

    expect(result!.dispString).not.toContain('<p>');
  });

  it('removes script, style and noscript bodies before searching', () => {
    const tab = {
      ...TAB,
      content: '<script>var espresso = "hidden";</script><style>.espresso{}</style><p>Visible text.</p>',
    };

    // "hidden" only occurs inside the stripped <script> body.
    expect(findInTabContent(tab, 'hidden')).toBeUndefined();
    expect(findInTabContent(tab, 'visible')).toBeDefined();
  });

  it('collapses newlines so the snippet stays on one line', () => {
    const tab = { ...TAB, content: 'line one\nline two\r\nespresso here' };

    expect(findInTabContent(tab, 'espresso')!.dispString).not.toContain('\n');
  });

  it('truncates a long title with an ellipsis', () => {
    const tab = { ...TAB, title: 'x'.repeat(60), content: 'espresso' };

    const result = findInTabContent(tab, 'espresso')!;

    expect(result.title).toHaveLength(46);
    expect(result.title.endsWith('…')).toBe(true);
  });

  it('leaves a short title intact', () => {
    expect(findInTabContent(TAB, 'espresso')!.title).toBe('Espresso Brewing Guide');
  });

  it('honours a custom snippet size', () => {
    const tab = { ...TAB, content: `${'a'.repeat(500)} espresso ${'b'.repeat(500)}` };

    const short = findInTabContent(tab, 'espresso', 10)!;
    const long = findInTabContent(tab, 'espresso', 200)!;

    expect(short.dispString.length).toBeLessThan(long.dispString.length);
  });

  it('clamps the snippet start at the beginning of the content', () => {
    const tab = { ...TAB, title: 'espresso', content: 'short body' };

    expect(() => findInTabContent(tab, 'espresso', 500)).not.toThrow();
  });
});
