/**
 * @fileoverview Dependency-free, regex-based scan of per-page PDF text that
 * flags which pages contain infographics, figures, charts, or tables — the
 * pages worth sending through a heavy OCR model (e.g. Granite Docling) instead
 * of the fast text-layer pipeline. Complements `detectPdfNeedsOcr` (which uses
 * LiteParse's native complexity analysis and is Node.js only): this scan runs
 * anywhere on plain strings, so it also powers the `"hybrid"` processor mode
 * of {@link convertPDFToHTML}.
 */

/**
 * Captions and labels that indicate a figure/table/graphic on the page,
 * e.g. "Figure 3", "Fig. 2:", "Table IV", "Chart 1", "Infographic 2".
 */
const CAPTION_REGEX =
  /\b(?:fig(?:ure)?s?|table|chart|graph|diagram|infographic|exhibit|illustration|plate|scheme)\s*\.?\s*(?:\d+(?:\.\d+)*|[ivxlcdm]+)\b/gi;

/**
 * A line that reads like a table row: 3+ cells separated by tabs or runs of
 * 2+ spaces (column-aligned text layers keep those gaps).
 */
const TABLE_ROW_REGEX = /^\s*\S[^\t\n]{0,60}?(?:\t+| {2,})\S[^\t\n]{0,60}?(?:\t+| {2,})\S/;

/**
 * A run of 3+ numeric cells (optionally with %, $, commas) in a row — data
 * tables and chart axis labels produce these even without column gaps.
 */
const NUMERIC_ROW_REGEX = /(?:[-+]?[\d][\d.,]*\s*[%$€£]?\s+){3,}[-+]?[\d]/;

/** Characters that show up when a text layer is garbled/unmapped glyphs. */
const GARBLED_REGEX = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Per-page result of {@link scanPagesForOCR}. */
export interface PageOcrScan {
  /** 1-based page number. */
  page: number;
  /** True when the page should be routed through OCR. */
  needsOcr: boolean;
  /**
   * Why the page was flagged: `"no-text"`, `"sparse-text"`, `"garbled-text"`,
   * `"figure-caption"`, `"table-caption"`, `"table-rows"`, `"numeric-grid"`.
   * Empty when `needsOcr` is false.
   */
  reasons: string[];
  /** Caption strings matched on the page (e.g. `"Figure 3"`, `"Table 2"`). */
  captions: string[];
}

/** Result of {@link scanPagesForOCR}. */
export interface OcrScanResult {
  /** True when any page was flagged. */
  needsOcr: boolean;
  /** 1-based page numbers of every flagged page. */
  pagesNeedingOcr: number[];
  /** Per-page detail, one entry per page in input order. */
  pages: PageOcrScan[];
}

/** Options for {@link scanPagesForOCR}. */
export interface ScanPagesForOCROptions {
  /**
   * Pages with fewer non-whitespace characters than this are flagged as
   * `"sparse-text"` (likely a scanned image or a full-page graphic).
   * default=200
   */
  sparseTextThreshold?: number;
  /** Minimum table-looking lines before flagging `"table-rows"`. default=3 */
  minTableRows?: number;
  /** Minimum numeric-run lines before flagging `"numeric-grid"`. default=2 */
  minNumericRows?: number;
}

/**
 * Scans per-page extracted text with regex heuristics and reports which pages
 * contain infographics/figures/tables (or have no usable text layer) and
 * therefore need to be OCR'd for full fidelity.
 *
 * @param pageTexts - Extracted plain text of each page, in page order
 * @param options - Threshold tuning, see {@link ScanPagesForOCROptions}
 * @category Extract
 */
export function scanPagesForOCR(
  pageTexts: string[],
  options: ScanPagesForOCROptions = {},
): OcrScanResult {
  const {
    sparseTextThreshold = 200,
    minTableRows = 3,
    minNumericRows = 2,
  } = options;

  const pages: PageOcrScan[] = pageTexts.map((text, index) => {
    const reasons: string[] = [];
    const compact = (text || "").replace(/\s+/g, " ").trim();

    // Text-layer health: nothing/near-nothing extractable means the page is
    // an image (scan or full-page infographic) as far as pdfjs is concerned.
    if (compact.length === 0) reasons.push("no-text");
    else if (compact.length < sparseTextThreshold) reasons.push("sparse-text");

    const garbled = (text || "").match(GARBLED_REGEX)?.length || 0;
    if (compact.length > 0 && garbled / compact.length > 0.05)
      reasons.push("garbled-text");

    // Captions referencing figures/charts vs tables. Only line-leading
    // matches count as flags — a real caption starts its own line, while
    // prose like "see Figure 1" does not mean the figure is on this page.
    const captions = [...(text || "").matchAll(CAPTION_REGEX)].map((m) =>
      m[0].replace(/\s+/g, " ").trim(),
    );
    const leadingCaptions = [
      ...(text || "").matchAll(new RegExp(`^\\s*${CAPTION_REGEX.source}`, "gim")),
    ].map((m) => m[0].trim());
    if (leadingCaptions.some((c) => /^table/i.test(c)))
      reasons.push("table-caption");
    if (leadingCaptions.some((c) => !/^table/i.test(c)))
      reasons.push("figure-caption");

    // Column-aligned or numeric rows.
    const lines = (text || "").split(/\r?\n/);
    const tableRows = lines.filter((line) => TABLE_ROW_REGEX.test(line)).length;
    const numericRows = lines.filter((line) =>
      NUMERIC_ROW_REGEX.test(line),
    ).length;
    if (tableRows >= minTableRows) reasons.push("table-rows");
    if (numericRows >= minNumericRows) reasons.push("numeric-grid");

    return {
      page: index + 1,
      needsOcr: reasons.length > 0,
      reasons,
      captions,
    };
  });

  const pagesNeedingOcr = pages
    .filter((page) => page.needsOcr)
    .map((page) => page.page);

  return { needsOcr: pagesNeedingOcr.length > 0, pagesNeedingOcr, pages };
}
