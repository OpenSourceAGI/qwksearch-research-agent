/**
 * Resolved configuration for the article extraction chain.
 *
 * Before this module every knob in `extract.ts` was a literal: `['en']` for
 * transcript languages, an APA-shaped citation, `SCRAPER_URL` read straight off
 * `process.env` inside the tier, a 10-second extractor timeout. That is fine
 * while there is one caller, and wrong the moment the Extraction settings pane
 * (migration to-do § 2.2) needs somewhere to write to.
 *
 * So the chain now takes an {@link ExtractionSettings} value, and this module is
 * the only place that decides what one contains:
 *
 * ```
 * DEFAULT_EXTRACTION_SETTINGS   the shipped behaviour
 *   ← environment (Worker vars + secrets)      server operator
 *   ← UserExtractionOverrides                  the signed-in user's settings
 *   ← ClientExtractionOverrides                per-request query parameters
 * ```
 *
 * Each layer only *narrows* the one above it, and every value is validated on
 * the way in — an unparseable setting falls back rather than throwing, because
 * a bad preference should not turn into a 500 on an article fetch.
 *
 * ## Why the layers are not symmetric
 *
 * The network-facing fields — `scraperUrl`, `scraperApiKey`, `tavilyApiKey`,
 * `pdfProcessorUrl`, `proxy` — are resolvable **from the environment only**.
 * They name hosts the Worker will send requests (and bearer tokens) to, so
 * accepting them from a query parameter would turn `/api/doc/article` into an
 * open request proxy and leak the configured keys to whatever host the caller
 * chose. {@link ClientExtractionOverrides} is deliberately typed to exclude
 * them, and {@link parseClientExtractionOverrides} never reads them.
 *
 * `pdfProcessor` is similarly withheld from the client layer: `docling` mode
 * runs OCR over every page, so letting an anonymous caller select it is a
 * compute-amplification lever, not a preference.
 */

/** Citation format for {@link buildCite} in `extract.ts`. */
export type CitationStyle = 'apa' | 'chicago' | 'mla';

/**
 * Where `extract-pdf` does OCR. Mirrors that package's `ProcessorMode`:
 * `frontend` is all-JS with no OCR, `hybrid` scans pages and OCRs only the ones
 * that look like infographics or tables, `docling` OCRs every page.
 */
export type PdfProcessor = 'docling' | 'frontend' | 'hybrid';

/** The tiers of the extraction chain, by the order they normally run in. */
export type TierId = 'crawler' | 'qwksearch' | 'scraper' | 'tavily';

export interface ExtractionSettings {
  /** Citation format used whenever the chain builds a `cite` itself. */
  citationStyle: CitationStyle;
  /** Preferred YouTube transcript languages, most-preferred first. */
  languages: string[];
  /** OCR strategy handed to `extract-pdf` for PDF and arXiv URLs. */
  pdfProcessor: PdfProcessor;
  /** Docling-compatible processor base URL, for `hybrid` / `docling`. */
  pdfProcessorUrl?: string;
  /** Outbound proxy for the extractor's own fetches. */
  proxy?: string;
  scraperApiKey?: string;
  /** Wall-clock budget for the Puppeteer render tier. */
  scraperDeadlineMs: number;
  /** Base URL of the Puppeteer render worker. */
  scraperUrl: string;
  tavilyApiKey?: string;
  /** Which tiers may run, in order. Tiers absent here are skipped entirely. */
  tiers: TierId[];
  /** `extract-webpage`'s own request timeout, in seconds. */
  timeoutSeconds: number;
  /** Let `extract-webpage` fall back to a third-party reader service. */
  useThirdPartyBackup: boolean;
}

/** Settings a signed-in user may choose. Excludes every host and credential. */
export type UserExtractionOverrides = Partial<
  Pick<
    ExtractionSettings,
    | 'citationStyle'
    | 'languages'
    | 'pdfProcessor'
    | 'tiers'
    | 'timeoutSeconds'
    | 'useThirdPartyBackup'
  >
>;

/**
 * Settings an unauthenticated caller may pass as query parameters. Narrower
 * than {@link UserExtractionOverrides} on purpose — see the module comment.
 */
export type ClientExtractionOverrides = Partial<
  Pick<ExtractionSettings, 'citationStyle' | 'languages'>
>;

export const DEFAULT_SCRAPER_URL = 'https://proxy.qwksearch.com';
export const DEFAULT_SCRAPER_DEADLINE_MS = 8000;
export const DEFAULT_TIMEOUT_SECONDS = 10;

/** Full chain order. `tiersForUrl` still narrows this per URL kind. */
export const DEFAULT_TIER_ORDER: TierId[] = ['qwksearch', 'scraper', 'tavily', 'crawler'];

export const CITATION_STYLES: CitationStyle[] = ['apa', 'chicago', 'mla'];
export const PDF_PROCESSORS: PdfProcessor[] = ['docling', 'frontend', 'hybrid'];

export const DEFAULT_EXTRACTION_SETTINGS: ExtractionSettings = {
  citationStyle: 'apa',
  languages: ['en'],
  pdfProcessor: 'frontend',
  scraperDeadlineMs: DEFAULT_SCRAPER_DEADLINE_MS,
  scraperUrl: DEFAULT_SCRAPER_URL,
  tiers: DEFAULT_TIER_ORDER,
  timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  useThirdPartyBackup: false,
};

/** A BCP-47-shaped tag: `en`, `pt-BR`, `zh-Hans-CN`. */
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i;

const MAX_LANGUAGES = 5;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** A trimmed non-empty string, or `undefined`. Never `''`. */
const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const list = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) return value.map((v) => text(v)).filter((v): v is string => !!v);
  const raw = text(value);
  return raw
    ? raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : undefined;
};

const boolish = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const raw = text(value)?.toLowerCase();
  if (raw === undefined) return undefined;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return undefined;
};

const integer = (value: unknown, min: number, max: number): number | undefined => {
  const raw = typeof value === 'number' ? value : Number(text(value));
  if (!Number.isFinite(raw)) return undefined;
  return clamp(Math.round(raw), min, max);
};

export const normalizeCitationStyle = (value: unknown): CitationStyle | undefined => {
  const raw = text(value)?.toLowerCase();
  return CITATION_STYLES.includes(raw as CitationStyle) ? (raw as CitationStyle) : undefined;
};

export const normalizePdfProcessor = (value: unknown): PdfProcessor | undefined => {
  const raw = text(value)?.toLowerCase();
  return PDF_PROCESSORS.includes(raw as PdfProcessor) ? (raw as PdfProcessor) : undefined;
};

/**
 * Keep the well-formed language tags, deduplicated, capped at five.
 *
 * Malformed entries are dropped rather than rejecting the whole list: a user
 * whose preferences read `en, klingon` should still get English transcripts.
 * A list with nothing valid left in it returns `undefined`, so the caller falls
 * back to the layer above instead of asking for transcripts in no language.
 */
export const normalizeLanguages = (value: unknown): string[] | undefined => {
  const entries = list(value);
  if (!entries) return undefined;
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!LANGUAGE_TAG.test(entry)) continue;
    const tag = entry.toLowerCase();
    if (!seen.has(tag)) seen.add(tag);
    if (seen.size >= MAX_LANGUAGES) break;
  }
  return seen.size > 0 ? [...seen] : undefined;
};

/**
 * Keep the recognised tier ids, deduplicated, in the order given.
 *
 * An empty result returns `undefined` rather than `[]`: a typo in
 * `QWKSEARCH_EXTRACT_TIERS` should not silently disable extraction entirely.
 */
export const normalizeTiers = (value: unknown): TierId[] | undefined => {
  const entries = list(value);
  if (!entries) return undefined;
  const seen = new Set<TierId>();
  for (const entry of entries) {
    const tier = entry.toLowerCase() as TierId;
    if (DEFAULT_TIER_ORDER.includes(tier)) seen.add(tier);
  }
  return seen.size > 0 ? [...seen] : undefined;
};

/** A `URL`-parseable http(s) origin. Anything else is dropped. */
export const normalizeHttpUrl = (value: unknown): string | undefined => {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return /^https?:$/.test(parsed.protocol) ? parsed.toString().replace(/\/$/, '') : undefined;
  } catch {
    return undefined;
  }
};

export type ExtractionEnv = Record<string, string | undefined>;

/**
 * The environment layer: Worker vars and secrets.
 *
 * `SCRAPER_URL`, `SCRAPER_API_KEY` and `TAVILY_API_KEY` keep the names the
 * tiers already read, so existing deployments need no change. The rest are new
 * and all optional.
 */
export const extractionSettingsFromEnv = (
  env: ExtractionEnv = process.env as ExtractionEnv,
): Partial<ExtractionSettings> => ({
  citationStyle: normalizeCitationStyle(env.QWKSEARCH_CITATION_STYLE),
  languages: normalizeLanguages(env.QWKSEARCH_EXTRACT_LANGUAGES),
  pdfProcessor: normalizePdfProcessor(env.PDF_PROCESSOR),
  pdfProcessorUrl: normalizeHttpUrl(env.PDF_PROCESSOR_URL),
  proxy: normalizeHttpUrl(env.QWKSEARCH_EXTRACT_PROXY),
  scraperApiKey: text(env.SCRAPER_API_KEY),
  scraperDeadlineMs: integer(env.QWKSEARCH_SCRAPER_DEADLINE_MS, 1000, 30_000),
  scraperUrl: normalizeHttpUrl(env.SCRAPER_URL),
  tavilyApiKey: text(env.TAVILY_API_KEY),
  tiers: normalizeTiers(env.QWKSEARCH_EXTRACT_TIERS),
  timeoutSeconds: integer(env.QWKSEARCH_EXTRACT_TIMEOUT, 1, 60),
  useThirdPartyBackup: boolish(env.QWKSEARCH_EXTRACT_THIRD_PARTY_BACKUP),
});

/** Drop `undefined` values so a partial layer cannot erase the layer below it. */
const defined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

/**
 * Validate and clamp an override layer. Applied to user and client overrides
 * alike, so a value that reaches {@link resolveExtractionSettings} through
 * either path gets the same treatment.
 */
export const normalizeOverrides = (
  overrides: UserExtractionOverrides = {},
): UserExtractionOverrides =>
  defined({
    citationStyle: normalizeCitationStyle(overrides.citationStyle),
    languages: normalizeLanguages(overrides.languages),
    pdfProcessor: normalizePdfProcessor(overrides.pdfProcessor),
    tiers: normalizeTiers(overrides.tiers),
    timeoutSeconds: integer(overrides.timeoutSeconds, 1, 60),
    useThirdPartyBackup: boolish(overrides.useThirdPartyBackup),
  });

/** Reads a request's query parameters; `c.req.query` satisfies it directly. */
export type QueryReader = (name: string) => null | string | undefined;

/**
 * The two extraction preferences safe to take straight off the query string.
 *
 * Everything else either names a host we would then send credentials to, or
 * buys the caller compute — see the module comment.
 */
export const parseClientExtractionOverrides = (query: QueryReader): ClientExtractionOverrides =>
  defined({
    citationStyle: normalizeCitationStyle(query('cite')),
    languages: normalizeLanguages(query('lang')),
  });

/**
 * Fold the layers into the settings the chain runs with.
 *
 * Later arguments win, but only where they carry a value that survived
 * validation — so a user preference cannot blank out an operator's scraper URL
 * by sending an empty string.
 */
export const resolveExtractionSettings = (
  env: ExtractionEnv = process.env as ExtractionEnv,
  ...overrides: Array<ClientExtractionOverrides | undefined | UserExtractionOverrides>
): ExtractionSettings => {
  let settings: ExtractionSettings = {
    ...DEFAULT_EXTRACTION_SETTINGS,
    ...defined(extractionSettingsFromEnv(env)),
  };
  for (const layer of overrides) {
    if (layer) settings = { ...settings, ...normalizeOverrides(layer) };
  }
  return settings;
};

/** Settings minus every credential, for logging and the diagnostics tool. */
export const redactExtractionSettings = (
  settings: ExtractionSettings,
): Omit<ExtractionSettings, 'scraperApiKey' | 'tavilyApiKey'> & {
  scraperApiKey: boolean;
  tavilyApiKey: boolean;
} => {
  const { scraperApiKey, tavilyApiKey, ...rest } = settings;
  return { ...rest, scraperApiKey: !!scraperApiKey, tavilyApiKey: !!tavilyApiKey };
};

/**
 * What the Extraction settings pane is told is currently in force.
 *
 * The value fields are exactly {@link UserExtractionOverrides}' keys, so "what
 * applies" and "what you may change" have the same shape. Everything the user
 * cannot set is reduced to a presence flag under `configured`: those fields name
 * hosts and credentials, and a proxy or scraper URL may itself carry basic-auth
 * credentials in its userinfo, so the pane learns *whether* the operator
 * configured one and never what it is.
 */
export interface ExtractionSettingsSummary extends Required<UserExtractionOverrides> {
  configured: {
    pdfProcessorUrl: boolean;
    proxy: boolean;
    scraperApiKey: boolean;
    scraperUrl: boolean;
    tavilyApiKey: boolean;
  };
}

export const extractionSettingsForClient = (
  settings: ExtractionSettings,
): ExtractionSettingsSummary => {
  const redacted = redactExtractionSettings(settings);

  return {
    citationStyle: redacted.citationStyle,
    configured: {
      pdfProcessorUrl: !!redacted.pdfProcessorUrl,
      proxy: !!redacted.proxy,
      scraperApiKey: redacted.scraperApiKey,
      // Configured by default — the shipped render worker — but the flag stays
      // honest if an operator blanks it.
      scraperUrl: !!redacted.scraperUrl,
      tavilyApiKey: redacted.tavilyApiKey,
    },
    languages: redacted.languages,
    pdfProcessor: redacted.pdfProcessor,
    tiers: redacted.tiers,
    timeoutSeconds: redacted.timeoutSeconds,
    useThirdPartyBackup: redacted.useThirdPartyBackup,
  };
};
