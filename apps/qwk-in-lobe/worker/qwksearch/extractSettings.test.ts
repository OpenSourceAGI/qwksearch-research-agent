// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EXTRACTION_SETTINGS,
  DEFAULT_SCRAPER_URL,
  extractionSettingsFromEnv,
  normalizeCitationStyle,
  normalizeHttpUrl,
  normalizeLanguages,
  normalizePdfProcessor,
  normalizeTiers,
  parseClientExtractionOverrides,
  redactExtractionSettings,
  resolveExtractionSettings,
} from './extractSettings';

/** Turns a plain object into the query reader the route passes in. */
const query = (params: Record<string, string>) => (name: string) => params[name];

describe('normalizers', () => {
  it('accepts the three citation styles case-insensitively and nothing else', () => {
    expect(normalizeCitationStyle('MLA')).toBe('mla');
    expect(normalizeCitationStyle(' chicago ')).toBe('chicago');
    expect(normalizeCitationStyle('harvard')).toBeUndefined();
    expect(normalizeCitationStyle('')).toBeUndefined();
    expect(normalizeCitationStyle(undefined)).toBeUndefined();
  });

  it('accepts the three pdf processor modes and nothing else', () => {
    expect(normalizePdfProcessor('hybrid')).toBe('hybrid');
    expect(normalizePdfProcessor('DOCLING')).toBe('docling');
    // A URL is a valid `ProcessorMode` upstream, but accepting one here would
    // make the OCR endpoint configurable from a settings value.
    expect(normalizePdfProcessor('https://docling.example.com')).toBeUndefined();
  });

  it('keeps well-formed language tags, deduplicated and capped', () => {
    expect(normalizeLanguages('en, pt-BR, zh-Hans-CN')).toEqual(['en', 'pt-br', 'zh-hans-cn']);
    expect(normalizeLanguages(['en', 'EN', 'fr'])).toEqual(['en', 'fr']);
    expect(normalizeLanguages('a,b,c,d,e,f,g,h')).toBeUndefined();
    expect(normalizeLanguages('en,fr,de,es,it,ja,ko')).toHaveLength(5);
  });

  it('drops a malformed tag instead of rejecting the whole list', () => {
    expect(normalizeLanguages('en, klingon!, fr')).toEqual(['en', 'fr']);
  });

  it('returns undefined for a list with nothing valid left, so the layer below wins', () => {
    expect(normalizeLanguages('!!,??')).toBeUndefined();
    expect(normalizeLanguages('')).toBeUndefined();
  });

  it('keeps the recognised tier ids in the order given', () => {
    expect(normalizeTiers('crawler, qwksearch')).toEqual(['crawler', 'qwksearch']);
    expect(normalizeTiers('qwksearch,nonsense,qwksearch')).toEqual(['qwksearch']);
    // A typo that leaves nothing must not silently disable extraction.
    expect(normalizeTiers('nonsense')).toBeUndefined();
  });

  it('accepts only http(s) urls, without a trailing slash', () => {
    expect(normalizeHttpUrl('https://proxy.example.com/')).toBe('https://proxy.example.com');
    expect(normalizeHttpUrl('http://localhost:8787')).toBe('http://localhost:8787');
    expect(normalizeHttpUrl('file:///etc/passwd')).toBeUndefined();
    expect(normalizeHttpUrl('not a url')).toBeUndefined();
  });
});

describe('extractionSettingsFromEnv', () => {
  it('reads the operator layer, keeping the existing variable names', () => {
    const env = extractionSettingsFromEnv({
      QWKSEARCH_CITATION_STYLE: 'mla',
      QWKSEARCH_EXTRACT_LANGUAGES: 'de,fr',
      QWKSEARCH_EXTRACT_THIRD_PARTY_BACKUP: 'true',
      QWKSEARCH_EXTRACT_TIMEOUT: '30',
      PDF_PROCESSOR: 'hybrid',
      QWKSEARCH_SCRAPER_DEADLINE_MS: '12000',
      SCRAPER_API_KEY: 'sk-scraper',
      SCRAPER_URL: 'https://render.example.com',
      TAVILY_API_KEY: 'tvly-key',
    });

    expect(env).toMatchObject({
      citationStyle: 'mla',
      languages: ['de', 'fr'],
      pdfProcessor: 'hybrid',
      scraperApiKey: 'sk-scraper',
      scraperDeadlineMs: 12_000,
      scraperUrl: 'https://render.example.com',
      tavilyApiKey: 'tvly-key',
      timeoutSeconds: 30,
      useThirdPartyBackup: true,
    });
  });

  it('leaves unset and unparseable variables undefined so defaults apply', () => {
    const env = extractionSettingsFromEnv({
      QWKSEARCH_CITATION_STYLE: 'harvard',
      SCRAPER_URL: '   ',
    });
    expect(env.citationStyle).toBeUndefined();
    expect(env.scraperUrl).toBeUndefined();
    expect(env.tavilyApiKey).toBeUndefined();
  });
});

describe('resolveExtractionSettings', () => {
  it('falls back to the shipped defaults with an empty environment', () => {
    expect(resolveExtractionSettings({})).toEqual(DEFAULT_EXTRACTION_SETTINGS);
    expect(resolveExtractionSettings({}).scraperUrl).toBe(DEFAULT_SCRAPER_URL);
  });

  it('layers overrides over the environment, last one winning', () => {
    const settings = resolveExtractionSettings(
      { QWKSEARCH_CITATION_STYLE: 'mla', QWKSEARCH_EXTRACT_LANGUAGES: 'de' },
      { citationStyle: 'chicago' },
      { languages: ['ja'] },
    );
    expect(settings.citationStyle).toBe('chicago');
    expect(settings.languages).toEqual(['ja']);
  });

  it('ignores an override that fails validation instead of erasing the layer below', () => {
    const settings = resolveExtractionSettings(
      { QWKSEARCH_CITATION_STYLE: 'mla', QWKSEARCH_EXTRACT_LANGUAGES: 'de' },
      { citationStyle: 'harvard' as never, languages: [''] },
    );
    expect(settings.citationStyle).toBe('mla');
    expect(settings.languages).toEqual(['de']);
  });

  it('clamps out-of-range numbers rather than passing them to the extractor', () => {
    expect(resolveExtractionSettings({}, { timeoutSeconds: 9999 }).timeoutSeconds).toBe(60);
    expect(resolveExtractionSettings({}, { timeoutSeconds: 0 }).timeoutSeconds).toBe(1);
    expect(
      resolveExtractionSettings({ QWKSEARCH_SCRAPER_DEADLINE_MS: '99' }).scraperDeadlineMs,
    ).toBe(1000);
  });

  it('never lets an override reach a host or a credential', () => {
    const settings = resolveExtractionSettings({ SCRAPER_URL: 'https://render.example.com' }, {
      // Fields outside `UserExtractionOverrides`; a caller casting past the
      // type must still not be able to redirect the render backend.
      scraperApiKey: 'stolen',
      scraperUrl: 'https://attacker.example.com',
      tavilyApiKey: 'stolen',
    } as never);

    expect(settings.scraperUrl).toBe('https://render.example.com');
    expect(settings.scraperApiKey).toBeUndefined();
    expect(settings.tavilyApiKey).toBeUndefined();
  });
});

describe('parseClientExtractionOverrides', () => {
  it('reads only the citation style and transcript languages', () => {
    expect(parseClientExtractionOverrides(query({ cite: 'mla', lang: 'fr,de' }))).toEqual({
      citationStyle: 'mla',
      languages: ['fr', 'de'],
    });
  });

  it('ignores every network-facing parameter a caller might try', () => {
    const overrides = parseClientExtractionOverrides(
      query({
        pdfProcessor: 'docling',
        pdfProcessorUrl: 'https://attacker.example.com',
        proxy: 'https://attacker.example.com',
        scraperUrl: 'https://attacker.example.com',
        tiers: 'crawler',
      }),
    ) as Record<string, unknown>;

    expect(Object.keys(overrides)).toEqual([]);
  });

  it('returns an empty object for an empty query string', () => {
    expect(parseClientExtractionOverrides(() => undefined)).toEqual({});
  });
});

describe('redactExtractionSettings', () => {
  it('reports whether each credential is set without revealing it', () => {
    const redacted = redactExtractionSettings(
      resolveExtractionSettings({ TAVILY_API_KEY: 'tvly-secret' }),
    );
    expect(redacted.tavilyApiKey).toBe(true);
    expect(redacted.scraperApiKey).toBe(false);
    expect(JSON.stringify(redacted)).not.toContain('tvly-secret');
  });
});
