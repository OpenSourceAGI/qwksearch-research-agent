/**
 * Client for `/api/doc/extraction-settings` — the per-user extraction
 * preferences the Worker resolves into the article extraction chain.
 *
 * The route is the authority on what a preference may be: every value is
 * validated on write and again on read, and each verb returns the same
 * `{ effective, options, overrides }` document. So this module transports and
 * types the response and never restates the server's validation — the enums,
 * the tier ids and the timeout bounds all arrive in `options`.
 *
 * Shapes mirror `worker/qwksearch/extractSettings.ts`. They are duplicated
 * rather than imported because `worker/` is bundled for workerd and the SPA is
 * bundled for the browser; `extractionSettings.contract.test.ts` fails if the
 * two drift.
 */

/** Citation format the chain builds a `cite` in. */
export type CitationStyle = 'apa' | 'chicago' | 'mla';

/** Where `extract-pdf` does OCR: none, page-selective, or every page. */
export type PdfProcessor = 'docling' | 'frontend' | 'hybrid';

/** The tiers of the extraction chain, in the order they normally run. */
export type TierId = 'crawler' | 'qwksearch' | 'scraper' | 'tavily';

/** The six fields a signed-in user may set. Hosts and credentials are absent. */
export interface UserExtractionOverrides {
  citationStyle?: CitationStyle;
  languages?: string[];
  pdfProcessor?: PdfProcessor;
  tiers?: TierId[];
  timeoutSeconds?: number;
  useThirdPartyBackup?: boolean;
}

/**
 * What is in force once the operator's environment is folded in.
 *
 * The value fields are exactly {@link UserExtractionOverrides}' keys, so "what
 * applies" and "what you may change" have the same shape. Everything the user
 * cannot set is reduced to a boolean under `configured`: those fields name
 * hosts and credentials, and a proxy URL may carry basic-auth credentials in
 * its userinfo, so the pane learns *whether* one is configured, never what.
 */
export interface ExtractionEffectiveSettings extends Required<UserExtractionOverrides> {
  configured: {
    pdfProcessorUrl: boolean;
    proxy: boolean;
    scraperApiKey: boolean;
    scraperUrl: boolean;
    tavilyApiKey: boolean;
  };
}

/** The enums and bounds the form builds its inputs from. */
export interface ExtractionFieldOptions {
  citationStyles: CitationStyle[];
  maxTimeoutSeconds: number;
  minTimeoutSeconds: number;
  pdfProcessors: PdfProcessor[];
  tiers: TierId[];
}

export interface ExtractionSettingsResponse {
  effective: ExtractionEffectiveSettings;
  options: ExtractionFieldOptions;
  overrides: UserExtractionOverrides;
}

export class ExtractionSettingsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ExtractionSettingsApiError';
  }
}

const ENDPOINT = '/api/doc/extraction-settings';

const request = async (init?: RequestInit): Promise<ExtractionSettingsResponse> => {
  const res = await fetch(ENDPOINT, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ExtractionSettingsApiError(
      body.error || body.message || res.statusText,
      res.status,
    );
  }

  return (await res.json()) as ExtractionSettingsResponse;
};

export const fetchExtractionSettings = () => request();

/**
 * Replace the stored overrides wholesale. The response echoes what survived
 * validation, which is what the form should render — not its own optimistic
 * state, since a five-language list or an unknown tier comes back trimmed.
 */
export const saveExtractionSettings = (overrides: UserExtractionOverrides) =>
  request({ body: JSON.stringify(overrides), method: 'PUT' });

/** Drop every override, returning the user to the operator's configuration. */
export const resetExtractionSettings = () => request({ method: 'DELETE' });
