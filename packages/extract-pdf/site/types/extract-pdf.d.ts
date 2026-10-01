/**
 * The slice of extract-pdf's API this site calls, for `tsc` only.
 *
 * `tsconfig.json` maps `extract-pdf` here instead of to `../src`: the package
 * source is not written for this site's `strict` settings, and its own build
 * is what checks it. Vite still bundles the real source (see `aliases.ts`).
 * Keep these in step with `../src/pdf-to-html.ts`.
 */
export interface OcrPageScan {
  page: number;
  needsOcr: boolean;
  reasons: string[];
  captions?: string[];
}

export interface OcrScanResult {
  needsOcr: boolean;
  pagesNeedingOcr: number[];
  pages: OcrPageScan[];
}

export interface ConvertPDFToHTMLOptions {
  addPageNumbers?: boolean;
  addCitation?: boolean;
  method?: 'ts-block-algorithm' | 'liteparse' | 'liteparse-wasm';
  processor?: 'frontend' | 'hybrid' | 'docling' | (string & {});
  processorUrl?: string;
}

export interface ConvertPDFToHTMLResult {
  html?: string;
  title?: string;
  author?: string;
  format?: 'pdf';
  processor?: string;
  ocrScan?: OcrScanResult;
  error?: string;
}

export function convertPDFToHTML(
  pdfURLOrBuffer: string | ArrayBuffer,
  options?: ConvertPDFToHTMLOptions,
): Promise<ConvertPDFToHTMLResult>;
