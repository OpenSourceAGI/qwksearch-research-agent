import { describe, it, expect } from "bun:test";
import { convertPDFToHTML } from "../src/pdf-to-html";
import { minimalPDFBuffer } from "./helpers/minimal-pdf";

const TIMEOUT = 30_000;

describe("convertPDFToHTML", () => {
  it("returns html and format fields from a buffer", async () => {
    const result = (await convertPDFToHTML(minimalPDFBuffer())) as any;
    expect(result.error).toBeUndefined();
    expect(result.format).toBe("pdf");
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it("html contains text extracted from the PDF", async () => {
    const result = (await convertPDFToHTML(minimalPDFBuffer())) as any;
    expect(result.html).toContain("Test Document");
    expect(result.html).toContain("sample paragraph");
  }, TIMEOUT);

  it("addPageNumbers inserts [1] marker", async () => {
    const result = (await convertPDFToHTML(minimalPDFBuffer(), {
      addPageNumbers: true,
    })) as any;
    expect(result.html).toMatch(/\[1\]/);
  }, TIMEOUT);

  it("addCitation: false returns html without extracting metadata", async () => {
    const result = (await convertPDFToHTML(minimalPDFBuffer(), {
      addCitation: false,
    })) as any;
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.author).toBeUndefined();
    expect(result.title).toBeUndefined();
  }, TIMEOUT);

  it("returns error object for an invalid buffer", async () => {
    const bad = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    const result = await convertPDFToHTML(bad);
    expect(result).toHaveProperty("error");
  }, TIMEOUT);

  it("accepts a PDF by URL", async () => {
    const url = "https://www.africau.edu/images/default/sample.pdf";
    const result = (await convertPDFToHTML(url)) as any;
    expect(result.error).toBeUndefined();
    expect(result.html.length).toBeGreaterThan(100);
  }, 60_000);
});
