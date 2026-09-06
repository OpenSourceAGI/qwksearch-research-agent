import { describe, it, expect } from "bun:test";
import { scanPagesForOCR } from "../src/ocr-page-scan";

const PROSE_PAGE = `Introduction
${"This is a normal paragraph of running prose about the research topic. ".repeat(
  8,
)}
The methodology as discussed in the literature applies here as well.`;

const TABLE_PAGE = `Results
Table 3. Quarterly revenue by region
Region    Q1    Q2    Q3
North     10.5  12.1  13.9
South     8.2   9.4   11.0
West      7.7   8.8   9.9
${"Additional commentary text follows the tabulated results shown above. ".repeat(4)}`;

const FIGURE_PAGE = `Figure 2: Architecture of the processing pipeline
${"The diagram above illustrates the flow between the system components. ".repeat(
  6,
)}`;

describe("scanPagesForOCR", () => {
  it("does not flag a plain prose page", () => {
    const result = scanPagesForOCR([PROSE_PAGE]);
    expect(result.needsOcr).toBe(false);
    expect(result.pagesNeedingOcr).toEqual([]);
    expect(result.pages[0].reasons).toEqual([]);
  });

  it("flags a page with a table caption and column-aligned numeric rows", () => {
    const result = scanPagesForOCR([PROSE_PAGE, TABLE_PAGE]);
    expect(result.needsOcr).toBe(true);
    expect(result.pagesNeedingOcr).toEqual([2]);
    const page = result.pages[1];
    expect(page.reasons).toContain("table-caption");
    expect(page.reasons).toContain("table-rows");
    expect(page.captions).toContain("Table 3");
  });

  it("flags a page with a figure caption", () => {
    const result = scanPagesForOCR([FIGURE_PAGE]);
    expect(result.pages[0].reasons).toContain("figure-caption");
    expect(result.pages[0].captions[0]).toMatch(/^Figure 2/);
  });

  it("does not flag prose that merely references a figure mid-sentence", () => {
    const page = `${"Plenty of ordinary text fills this page with running prose. ".repeat(
      6,
    )}As shown in Figure 4 the trend continues upward over time.`;
    const result = scanPagesForOCR([page]);
    expect(result.pages[0].reasons).not.toContain("figure-caption");
  });

  it("flags empty and sparse pages as needing OCR", () => {
    const result = scanPagesForOCR(["", "Short scan artifact"]);
    expect(result.pages[0].reasons).toContain("no-text");
    expect(result.pages[1].reasons).toContain("sparse-text");
    expect(result.pagesNeedingOcr).toEqual([1, 2]);
  });

  it("respects threshold options", () => {
    const result = scanPagesForOCR(["Short scan artifact"], {
      sparseTextThreshold: 5,
    });
    expect(result.pages[0].needsOcr).toBe(false);
  });

  it("reports 1-based page numbers in input order", () => {
    const result = scanPagesForOCR([PROSE_PAGE, PROSE_PAGE, TABLE_PAGE]);
    expect(result.pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(result.pagesNeedingOcr).toEqual([3]);
  });
});
