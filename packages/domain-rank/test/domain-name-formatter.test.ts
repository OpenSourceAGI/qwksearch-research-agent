import { describe, expect, it, spyOn } from 'bun:test';
import {
  cleanSourceTitle,
  findMainDomain,
  formatDomainAsTitle,
  getSourceTitle,
  getTitleOverride,
  shouldRemoveDomain,
} from '../src/domain-name-formatter';
import { duplicates, removals, titles } from '../src/data/duplicates.js';

describe('shouldRemoveDomain', () => {
  it('flags a domain on the removal list', () => {
    expect(shouldRemoveDomain(removals[0].main)).toBe(true);
  });

  it('does not flag an ordinary domain', () => {
    expect(shouldRemoveDomain('example-not-on-any-list.com')).toBe(false);
  });
});

describe('findMainDomain', () => {
  it('maps an alternative domain to its main domain', () => {
    const withAlt = duplicates.find((d: { alt?: string[] }) => d.alt?.length);

    expect(findMainDomain(withAlt.alt[0])).toBe(withAlt.main);
  });

  it('returns null for a domain that is nobody alternative', () => {
    expect(findMainDomain('example-not-a-duplicate.com')).toBeNull();
  });
});

describe('getTitleOverride', () => {
  it('returns a manually curated title', () => {
    const [domain, title] = Object.entries(titles)[0];

    expect(getTitleOverride(domain)).toBe(title as string);
  });

  it('returns null when there is no override', () => {
    expect(getTitleOverride('example-no-override.com')).toBeNull();
  });
});

describe('formatDomainAsTitle', () => {
  it('capitalizes a simple domain', () => {
    expect(formatDomainAsTitle('example.com')).toBe('Example');
  });

  it('drops the suffix', () => {
    expect(formatDomainAsTitle('github.com')).toBe('Github');
    expect(formatDomainAsTitle('mozilla.org')).toBe('Mozilla');
  });

  it('normalizes casing, since hostnames are case-insensitive', () => {
    // tldts lowercases the host, so a camelCased domain arrives flattened.
    expect(formatDomainAsTitle('myCoolSite.com')).toBe('Mycoolsite');
    expect(formatDomainAsTitle('MYCOOLSITE.com')).toBe('Mycoolsite');
  });

  it('separates letters from digits', () => {
    expect(formatDomainAsTitle('web3news.com')).toContain('3');
    expect(formatDomainAsTitle('web3news.com').split(' ').length).toBeGreaterThan(1);
  });

  it('splits out common publication words', () => {
    expect(formatDomainAsTitle('businessinsider.com')).toBe('Business Insider');
  });

  it('upper-cases very short names', () => {
    expect(formatDomainAsTitle('bbc.co.uk')).toBe('BBC');
  });

  it('always returns a non-empty string', () => {
    for (const domain of ['a.com', 'example.org', 'news.example.co.uk']) {
      expect(formatDomainAsTitle(domain).length, domain).toBeGreaterThan(0);
    }
  });
});

describe('cleanSourceTitle', () => {
  it('returns null for empty input', () => {
    expect(cleanSourceTitle('')).toBeNull();
    expect(cleanSourceTitle('   ')).toBeNull();
  });

  it('keeps a plain title unchanged', () => {
    expect(cleanSourceTitle('The Example Times')).toBe('The Example Times');
  });

  it('keeps the longest segment of a split title', () => {
    expect(cleanSourceTitle('Home | The Very Long Publication Name')).toBe(
      'The Very Long Publication Name'
    );
  });

  it('leaves short segments alone rather than truncating to noise', () => {
    // No segment clears the 10 character bar, so the title is kept whole.
    expect(cleanSourceTitle('A | B')).toBe('A | B');
  });

  it('strips boilerplate suffixes', () => {
    expect(cleanSourceTitle('Example Publication - Official Site')).toBe('Example Publication');
    expect(cleanSourceTitle('Example Publication | Homepage')).toBe('Example Publication');
  });

  it('strips HTML tags', () => {
    expect(cleanSourceTitle('<b>Bold Publication Name</b>')).toBe('Bold Publication Name');
  });

  it('collapses runs of whitespace', () => {
    expect(cleanSourceTitle('Spaced    Out    Title')).toBe('Spaced Out Title');
  });

  it('caps the title at 150 characters', () => {
    expect(cleanSourceTitle('x'.repeat(300))!.length).toBe(150);
  });
});

describe('getSourceTitle', () => {
  it('prefers the og:title meta tag', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><head><meta property="og:title" content="OG Title" /><title>Tag Title</title></head></html>',
    } as Response);

    expect(await getSourceTitle('example.com')).toBe('OG Title');
    fetchSpy.mockRestore();
  });

  it('falls back to the <title> tag', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '<html><head><title>  Tag Title  </title></head></html>',
    } as Response);

    expect(await getSourceTitle('example.com')).toBe('Tag Title');
    fetchSpy.mockRestore();
  });

  it('returns null when neither is present', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '<html><body>No title here</body></html>',
    } as Response);

    expect(await getSourceTitle('example.com')).toBeNull();
    fetchSpy.mockRestore();
  });

  it('returns null on a non-ok response', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      text: async () => '',
    } as Response);

    expect(await getSourceTitle('example.com')).toBeNull();
    fetchSpy.mockRestore();
  });

  it('returns null instead of throwing when the request fails', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    expect(await getSourceTitle('example.com')).toBeNull();
    fetchSpy.mockRestore();
  });
});
