import { describe, it, expect } from "bun:test";
import { convertPDFToHTML } from "../src/pdf-to-html";

/**
 * Builds a minimal 1-page valid PDF in memory with a 24pt heading
 * ("Test Document") and a 12pt body line ("This is a sample paragraph.").
 */
function minimalPDFBuffer(): ArrayBuffer {
  const stream = [
    "BT",
    "/F1 24 Tf 72 700 Td (Test Document) Tj",
    "/F1 12 Tf 0 -50 Td (This is a sample paragraph.) Tj",
    "ET",
  ].join("\n");

  const objs: (string | null)[] = [
    null,
    "<</Type /Catalog /Pages 2 0 R>>",
    "<</Type /Pages /Kids [3 0 R] /Count 1>>",
    "<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>",
    "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];

  let doc = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let n = 1; n <= 5; n++) {
    offsets[n] = doc.length;
    doc += `${n} 0 obj\n${objs[n]}\nendobj\n`;
  }

  const xrefAt = doc.length;
  doc += "xref\n0 6\n";
  doc += "0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++)
    doc += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  doc += `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return new TextEncoder().encode(doc).buffer;
}

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
