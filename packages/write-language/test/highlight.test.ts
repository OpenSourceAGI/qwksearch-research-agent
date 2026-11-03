/**
 * @fileoverview Unit tests for the highlight.js wiring behind `highlightCode`.
 */
import { describe, expect, it } from "vitest";
import { highlightCode } from "../src/utils/highlight";

describe("highlightCode", () => {
  it("highlights a registered language", () => {
    expect(highlightCode("const a = 1;", "javascript")).toContain(
      '<span class="hljs-keyword">const</span>',
    );
  });

  it("resolves aliases, including the JSX/TSX ones registered here", () => {
    expect(highlightCode("x = 1", "py")).toContain("hljs-");
    expect(highlightCode("const a = <div />;", "jsx")).toContain("hljs-");
    expect(highlightCode("const a: number = 1;", "tsx")).toContain("hljs-");
    expect(highlightCode("<p>hi</p>", "markup")).toContain("hljs-");
  });

  it("returns null for a language it does not know", () => {
    expect(highlightCode("x", "notalanguage")).toBeNull();
    expect(highlightCode("x", "")).toBeNull();
  });

  it("escapes HTML in the source", () => {
    const html = highlightCode('const s = "<script>";', "javascript");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
