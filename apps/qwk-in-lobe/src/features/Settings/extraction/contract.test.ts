/**
 * The seam guard between the pane and the Worker route that feeds it.
 *
 * `src/` is bundled for the browser and `worker/` for workerd, so the pane
 * cannot import the Worker's types — it restates them in `api.ts`. This file is
 * the only place the two halves meet: it imports the real resolver, builds the
 * exact document the route would return, and asserts the client's types and the
 * form's translation still describe it.
 *
 * If a citation style, a tier or an override field is added on the server and
 * not here, one of these fails.
 */
import { describe, expect, it } from 'vitest';

import {
  CITATION_STYLES,
  DEFAULT_TIER_ORDER,
  extractionSettingsForClient,
  normalizeOverrides,
  PDF_PROCESSORS,
  resolveExtractionSettings,
  type UserExtractionOverrides as WorkerOverrides,
} from '../../../../worker/qwksearch/extractSettings';
import type {
  CitationStyle,
  ExtractionEffectiveSettings,
  ExtractionFieldOptions,
  ExtractionSettingsResponse,
  PdfProcessor,
  TierId,
  UserExtractionOverrides,
} from './api';
import { formValuesFromResponse, overridesFromFormValues } from './formState';

/** Mirrors `fieldOptions` in `worker/routes/qwksearch/extractionSettings.ts`. */
const fieldOptions: ExtractionFieldOptions = {
  citationStyles: CITATION_STYLES,
  maxTimeoutSeconds: 60,
  minTimeoutSeconds: 1,
  pdfProcessors: PDF_PROCESSORS,
  tiers: DEFAULT_TIER_ORDER,
};

/** Mirrors the route's `body()` helper. */
const routeBody = (
  overrides: WorkerOverrides,
  env: Record<string, string | undefined> = {},
): ExtractionSettingsResponse => ({
  effective: extractionSettingsForClient(resolveExtractionSettings(env, overrides)),
  options: fieldOptions,
  overrides,
});

describe('client types cover the server contract', () => {
  it('assigns the resolver output to the client response type', () => {
    // A structural mismatch is a compile error; the runtime assertion keeps the
    // test honest about actually having built the value.
    const response: ExtractionSettingsResponse = routeBody({});

    expect(Object.keys(response).sort()).toEqual(['effective', 'options', 'overrides']);
  });

  it('knows every citation style, PDF processor and tier the server ships', () => {
    // The `satisfies` is the assertion: an added enum member the client type
    // does not name fails to compile here.
    expect(CITATION_STYLES satisfies CitationStyle[]).toEqual(['apa', 'chicago', 'mla']);
    expect(PDF_PROCESSORS satisfies PdfProcessor[]).toEqual(['docling', 'frontend', 'hybrid']);
    expect(DEFAULT_TIER_ORDER satisfies TierId[]).toEqual([
      'qwksearch',
      'scraper',
      'tavily',
      'crawler',
    ]);
  });

  it('names exactly the six fields the server accepts as overrides', () => {
    // Every key of the summary except `configured` is an editable field, by the
    // server's own `Required<UserExtractionOverrides> & { configured }` shape.
    const summary = routeBody({}).effective;
    const editable = Object.keys(summary).filter((key) => key !== 'configured');

    expect(editable.sort()).toEqual([
      'citationStyle',
      'languages',
      'pdfProcessor',
      'tiers',
      'timeoutSeconds',
      'useThirdPartyBackup',
    ]);
  });

  it('reports every host and credential as a presence flag, never a value', () => {
    const { configured } = routeBody(
      {},
      {
        PDF_PROCESSOR_URL: 'https://ocr.example',
        QWKSEARCH_EXTRACT_PROXY: 'https://user:secret@proxy.example',
        SCRAPER_API_KEY: 'sk-scraper',
        TAVILY_API_KEY: 'tvly-secret',
      },
    ).effective;

    expect(configured).toEqual({
      pdfProcessorUrl: true,
      proxy: true,
      scraperApiKey: true,
      scraperUrl: true,
      tavilyApiKey: true,
    });
    expect(JSON.stringify(routeBody({}, { TAVILY_API_KEY: 'tvly-secret' }))).not.toContain(
      'tvly-secret',
    );
  });
});

describe('the form round-trips through the real validator', () => {
  const overrides: UserExtractionOverrides = {
    citationStyle: 'chicago',
    languages: ['pt-BR', 'en'],
    pdfProcessor: 'hybrid',
    tiers: ['qwksearch', 'tavily'],
    timeoutSeconds: 30,
    useThirdPartyBackup: false,
  };

  it('survives a load → edit → save cycle unchanged', () => {
    const stored = normalizeOverrides(overrides as WorkerOverrides);
    const sent = overridesFromFormValues(formValuesFromResponse(routeBody(stored)));

    expect(normalizeOverrides(sent as WorkerOverrides)).toEqual(stored);
  });

  it('sends nothing the server would reject as an empty override document', () => {
    // An untouched form must not be able to write a row at all.
    expect(normalizeOverrides(overridesFromFormValues(formValuesFromResponse(routeBody({}))))).toEqual(
      {},
    );
  });

  it('lets an explicit `false` through, which an omitted key could not express', () => {
    const sent = overridesFromFormValues({ useThirdPartyBackup: 'off' });

    expect(normalizeOverrides(sent as WorkerOverrides)).toEqual({ useThirdPartyBackup: false });
  });

  it('shows the operator layer as `effective` while `overrides` stays the user\'s', () => {
    const env = { QWKSEARCH_CITATION_STYLE: 'mla', QWKSEARCH_EXTRACT_TIMEOUT: '42' };
    const response = routeBody({ citationStyle: 'apa' }, env);

    // The user set only the citation style, so the timeout input stays empty
    // even though 42s is what an extraction would actually use.
    expect(response.effective.timeoutSeconds).toBe(42);
    expect(formValuesFromResponse(response).timeoutSeconds).toBeNull();
    expect(formValuesFromResponse(response).citationStyle).toBe('apa');
  });

  it('follows the server when it trims a value the form offered', () => {
    // Six languages go in; the server keeps five, and the form must render the
    // response rather than its own optimistic state.
    const sent = { languages: ['en', 'fr', 'de', 'es', 'it', 'ja'] };
    const stored = normalizeOverrides(sent as WorkerOverrides);

    expect(stored.languages).toHaveLength(5);
    expect(formValuesFromResponse(routeBody(stored)).languages).toEqual(stored.languages);
  });
});

describe('the effective document is assignable to the client type', () => {
  it('matches field by field', () => {
    const effective: ExtractionEffectiveSettings = extractionSettingsForClient(
      resolveExtractionSettings({}),
    );

    expect(effective.citationStyle).toBe('apa');
    expect(effective.languages).toEqual(['en']);
    expect(effective.tiers).toEqual(DEFAULT_TIER_ORDER);
  });
});
