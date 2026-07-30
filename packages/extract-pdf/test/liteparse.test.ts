import { describe, it, expect } from "bun:test";
import { convertPDFToHTML } from "../src/pdf-to-html";
import { convertPDFToHTMLWithLiteParse } from "../src/liteparse-to-html";
import { detectPdfNeedsOcr } from "../src/detect-needs-ocr";
import { minimalPDFBuffer, blankPDFBuffer } from "./helpers/minimal-pdf";

const TIMEOUT = 30_000;

describe("convertPDFToHTMLWithLiteParse", () => {
  it("returns html and format fields from a buffer", async () => {
    const result = (await convertPDFToHTMLWithLiteParse(minimalPDFBuffer())) as any;
    expect(result.error).toBeUndefined();
    expect(result.format).toBe("pdf");
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it("html contains text extracted from the PDF", async () => {
    const result = (await convertPDFToHTMLWithLiteParse(minimalPDFBuffer())) as any;
    expect(result.html).toContain("Test Document");
    expect(result.html).toContain("sample paragraph");
  }, TIMEOUT);

  it("addPageNumbers inserts [1] marker", async () => {
    const result = (await convertPDFToHTMLWithLiteParse(minimalPDFBuffer(), {
      addPageNumbers: true,
    })) as any;
    expect(result.html).toMatch(/\[1\]/);
  }, TIMEOUT);

  it("addCitation: false returns html without extracting metadata", async () => {
    const result = (await convertPDFToHTMLWithLiteParse(minimalPDFBuffer(), {
      addCitation: false,
    })) as any;
    expect(typeof result.html).toBe("string");
    expect(result.author).toBeUndefined();
    expect(result.title).toBeUndefined();
  }, TIMEOUT);

  it("returns error object for an invalid buffer", async () => {
    const bad = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    const result = await convertPDFToHTMLWithLiteParse(bad);
    expect(result).toHaveProperty("error");
  }, TIMEOUT);
});

describe("convertPDFToHTML method dispatch", () => {
  it("method: 'liteparse' delegates to convertPDFToHTMLWithLiteParse", async () => {
    const result = (await convertPDFToHTML(minimalPDFBuffer(), {
      method: "liteparse",
    })) as any;
    expect(result.error).toBeUndefined();
    expect(result.format).toBe("pdf");
    expect(result.html).toContain("Test Document");
  }, TIMEOUT);
});

describe("detectPdfNeedsOcr", () => {
  it("flags a page with no text at all as needing OCR", async () => {
    const assessment = await detectPdfNeedsOcr(blankPDFBuffer());
    expect(assessment.needsOcr).toBe(true);
    expect(assessment.pages).toHaveLength(1);
    expect(assessment.pages[0].needsOcr).toBe(true);
    expect(assessment.reasons.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it("returns one complexity entry per page with a reasons array", async () => {
    const assessment = await detectPdfNeedsOcr(minimalPDFBuffer());
    expect(assessment.pages).toHaveLength(1);
    expect(assessment.pages[0].pageNumber).toBe(1);
    expect(typeof assessment.pages[0].needsOcr).toBe("boolean");
    expect(Array.isArray(assessment.pages[0].reasons)).toBe(true);
    expect(Array.isArray(assessment.reasons)).toBe(true);
  }, TIMEOUT);
});
