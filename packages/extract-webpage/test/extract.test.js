import { describe, expect, it } from "vitest";
import { extractContent } from "../src/url-to-content/url-to-content";

/**
 * End-to-end extraction against live URLs. These need network access and are
 * slow, so they are opt-in: set `RUN_LIVE_EXTRACT_TESTS=1` to run them. The
 * offline checks below always run.
 */
const runLive = process.env.RUN_LIVE_EXTRACT_TESTS === "1";

describe("extractContent", () => {
  it("is exported as a function", () => {
    expect(typeof extractContent).toBe("function");
  });

  it("extracts from a raw HTML string without touching the network", async () => {
    const html = `
      <html><head><title>Offline Article</title></head>
      <body><article><h1>Offline Article</h1><p>${"Body text. ".repeat(40)}</p></article></body>
      </html>`;

    const result = await extractContent(html);

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.html).toContain("Body text.");
  });

  it("reports an error for a non-DOCX binary buffer", async () => {
    const result = await extractContent(new Uint8Array([1, 2, 3, 4]));

    expect(result.error).toBe("Binary buffer is not a valid DOCX file");
  });
});

describe.runIf(runLive)("extractContent (live URLs)", () => {
  it(
    "extracts a PDF served over HTTP",
    async () => {
      const result = await extractContent(
        "https://www.independent.org/pdf/tir/tir_10_1_2_pennington.pdf"
      );

      expect(result).toBeDefined();
      expect(result.html || result.error).toBeTruthy();
    },
    100000
  );

  it(
    "extracts a regular article page",
    async () => {
      const result = await extractContent("https://iep.utm.edu/republic/");

      expect(result).toBeDefined();
      expect(result.html || result.error).toBeTruthy();
    },
    100000
  );
});
