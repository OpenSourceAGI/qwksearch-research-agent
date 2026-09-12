/**
 * @fileoverview Unit tests for the Prism wiring behind `highlightCode`.
 */
import { describe, expect, it } from "vitest";
import { highlightCode } from "../src/utils/prism";
import { loadPrismGrammars } from "../src/utils/prism-global";

describe("highlightCode", () => {
  it("highlights a language prismjs' entry point already bundles", () => {
    expect(highlightCode("const a = 1;", "javascript")).toContain("token");
  });

  it("returns null for a language Prism does not know", () => {
    expect(highlightCode("x", "notalanguage")).toBeNull();
  });

  it("highlights a language that only arrives with the loaded grammars", async () => {
    await loadPrismGrammars();

    expect(highlightCode("x = 1", "python")).toContain("token");
  });

  it("publishes Prism on the global object for the grammar scripts to find", () => {
    expect(
      (globalThis as typeof globalThis & { Prism?: unknown }).Prism,
    ).toBeDefined();
  });
});
