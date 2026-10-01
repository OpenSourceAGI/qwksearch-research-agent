/**
 * The slice of extract-webpage's API this site calls, for `tsc` only.
 *
 * `tsconfig.json` maps `extract-webpage/url-to-content/url-to-content` here
 * instead of to the package source, which is not written for this site's
 * `strict` settings. Vite still bundles the real source (see `aliases.ts`).
 * Keep these in step with `extract-webpage/src/url-to-content/url-to-content.ts`.
 */
export interface ExtractContentOptions {
  images?: boolean;
  links?: boolean;
  formatting?: boolean;
  absoluteURLs?: boolean;
  timeout?: number;
  proxy?: string | null;
  citeFormatMonthFull?: boolean;
  citeFormatAuthorFull?: boolean;
  url?: string;
  useThirdPartyBackup?: boolean;
  languages?: string[];
}

export interface ExtractedArticle {
  cite?: string;
  html?: string;
  url?: string;
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: number | string;
  date?: string;
  title?: string;
  source?: string;
  word_count?: number;
  format?: string;
  error?: string | number;
}

export function extractContent(
  urlOrDoc: string | ArrayBuffer | Uint8Array,
  options?: ExtractContentOptions,
): Promise<ExtractedArticle>;
