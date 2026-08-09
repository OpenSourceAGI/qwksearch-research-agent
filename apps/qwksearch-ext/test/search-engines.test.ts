import { describe, expect, it } from 'vitest';
import { searchEngines } from '../content/search-engines';

describe('searchEngines', () => {
  it('defines a list of engines', () => {
    expect(searchEngines.length).toBeGreaterThan(0);
  });

  it('gives every engine a name, url and icon', () => {
    for (const engine of searchEngines) {
      expect(engine.name, 'name').toBeTruthy();
      expect(engine.url, `${engine.name}.url`).toBeTruthy();
      expect(engine.icon, `${engine.name}.icon`).toBeTruthy();
    }
  });

  it('does not repeat an engine name', () => {
    const names = searchEngines.map((e) => e.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('points every engine at an https URL', () => {
    for (const engine of searchEngines) {
      expect(engine.url, engine.name).toMatch(/^https:\/\//);
      expect(() => new URL(engine.url)).not.toThrow();
    }
  });

  it('leaves search URLs ready for the query to be appended', () => {
    for (const engine of searchEngines) {
      // Three valid shapes: a trailing query parameter (most engines), a
      // trailing hash path (Gmail), or a plain landing page that takes no
      // query at all (ChatGPT).
      const takesQueryParam = /[?&][^=]+=$/.test(engine.url);
      const takesHashPath = /#[^/]*\/$/.test(engine.url);
      const isLandingPage = /^https:\/\/[^/]+\/?$/.test(engine.url);
      expect(
        takesQueryParam || takesHashPath || isLandingPage,
        `${engine.name}: ${engine.url}`
      ).toBe(true);
    }
  });

  it('stores icons as bare base64 without a data URI prefix', () => {
    for (const engine of searchEngines) {
      expect(engine.icon, engine.name).not.toContain('data:');
      expect(engine.icon, engine.name).toMatch(/^[A-Za-z0-9+/=]+$/);
    }
  });

  it('leads with the first-party engines', () => {
    expect(searchEngines[0].name).toBe('QwkSearch');
    expect(searchEngines[0].url).toContain('qwksearch.com');
  });

  it('includes the major web search engines', () => {
    const names = searchEngines.map((e) => e.name);

    expect(names).toContain('Google');
    expect(names).toContain('DuckDuckGo');
    expect(names).toContain('Perplexity');
  });

  it('marks only ChatGPT as disabled', () => {
    const disabled = searchEngines.filter((e) => e.disabled).map((e) => e.name);

    expect(disabled).toEqual(['ChatGPT']);
  });

  it('builds a working search URL by appending an encoded query', () => {
    const google = searchEngines.find((e) => e.name === 'Google')!;

    const url = new URL(google.url + encodeURIComponent('rust & go'));

    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('q')).toBe('rust & go');
  });

  it('covers shopping and social categories, not just web search', () => {
    const names = searchEngines.map((e) => e.name);

    expect(names).toContain('Amazon');
    expect(names).toContain('Reddit');
    expect(names).toContain('LinkedIn');
  });
});
