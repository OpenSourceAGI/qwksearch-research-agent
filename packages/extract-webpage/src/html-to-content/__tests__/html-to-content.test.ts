/**
 * @fileoverview extractContentAndCite returns paper-metrics text metrics
 * alongside the extracted HTML and citation fields.
 */
import { describe, expect, it } from "vitest";
import { getHtmlMetrics } from "paper-metrics";
import { extractContentAndCite } from "../html-to-content";

const SAMPLE =
  "Playing games has always been thought to be important to the development of well-balanced and creative children; however, what part, if any, they should play in the lives of adults has never been researched that deeply. I believe that playing games is every bit as important for adults as for children. Not only is taking time out to play games with our children and other adults valuable to building interpersonal relationships but is also a wonderful way to release built up tension.";

describe("extractContentAndCite metrics", () => {
  it("adds a metrics object computed from the extracted HTML, keeping the existing fields", () => {
    const page = `<html><head><title>Games and Adults</title></head><body><nav>Home About</nav><article><h1>Games and Adults</h1>${SAMPLE.split(". ")
      .map((s) => `<p>${s.replace(/\.$/, "")}.</p>`)
      .join("")}<p>${SAMPLE}</p></article></body></html>`;
    const result = extractContentAndCite(page, { url: "https://example.com/games" });

    expect(result.html).toBeTruthy();
    expect(result).toHaveProperty("title");
    expect(result.metrics).toEqual(getHtmlMetrics(result.html));
    expect(result.metrics.words).toBeGreaterThan(150);
    expect(result.metrics.sentences).toBeGreaterThanOrEqual(6);
    expect(result.metrics.readabilityScore).toEqual(expect.any(Number));
    expect(result.metrics.textStandardLabel).toMatch(/grade$/);
  });
});
