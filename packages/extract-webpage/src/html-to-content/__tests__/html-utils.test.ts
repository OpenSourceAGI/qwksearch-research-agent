/**
 * @fileoverview Tests for regexp-based Markdown detection, navigation/noise
 * removal, and Markdown-to-HTML conversion used on JINA-style extractions.
 */
import { describe, expect, it } from "vitest";
import {
  convertMarkdownToFormattedHTML,
  detectMarkdown,
  removeMarkdownNavigation,
} from "../html-utils";

describe("detectMarkdown", () => {
  it("detects typical markdown documents", () => {
    expect(
      detectMarkdown("# Title\n\nSome **bold** text.\n\n- item 1\n- item 2")
    ).toBe(true);
  });

  it("detects JINA reader output", () => {
    const jina = [
      "Markdown Content:",
      "Michael Jackson",
      "===============",
      "",
      "[![Image 1](https://i.scdn.co/image/abc)](/album/1)",
      "[Thriller](/album/1C2h7mLntPSeVYciMRTF4a)",
      "[Bad 25th Anniversary](/album/24TAupSNVWSAHL0R7n71vm)",
    ].join("\n");
    expect(detectMarkdown(jina)).toBe(true);
  });

  it("detects link-heavy markdown with a single syntax signal", () => {
    const links = [
      "[Dangerous](/album/0oX4SealMgNXrvRDhqqOKg) some text",
      "more [Invincible](/album/52E4RP7XDzalpIrOgSTgiQ) text",
      "and [HIStory](/album/3OBhnTLrvkoEEETjFA3Qfk) too",
    ].join("\n");
    expect(detectMarkdown(links)).toBe(true);
  });

  it("does not flag HTML documents", () => {
    expect(
      detectMarkdown(
        "<html><body><h1>Title</h1><p>Some **bold** text</p><ul><li>a</li></ul></body></html>"
      )
    ).toBe(false);
  });

  it("does not flag HTML fragments with several closing tags", () => {
    expect(
      detectMarkdown(
        "<div><p>One - two</p><p>Three</p><p>- looks like a list</p></div>"
      )
    ).toBe(false);
  });

  it("does not flag plain text", () => {
    expect(
      detectMarkdown("Just a plain sentence.\nAnother plain sentence here.")
    ).toBe(false);
  });

  it("handles empty and non-string input", () => {
    expect(detectMarkdown("")).toBe(false);
    expect(detectMarkdown(null as any)).toBe(false);
    expect(detectMarkdown(undefined as any)).toBe(false);
  });
});

describe("removeMarkdownNavigation", () => {
  it("removes JINA reader metadata lines", () => {
    const input = [
      "Title: Some Page",
      "URL Source: https://example.com",
      "Published Time: 2024-01-01",
      "Markdown Content:",
      "",
      "Real article text here.",
    ].join("\n");
    const output = removeMarkdownNavigation(input);
    expect(output).toBe("Real article text here.");
  });

  it("removes navigation phrase lines", () => {
    const input = [
      "[Skip to content](#main)",
      "[Sign in](/login)",
      "Real paragraph of the article.",
      "[Back to top](#top)",
    ].join("\n");
    const output = removeMarkdownNavigation(input);
    expect(output).toBe("Real paragraph of the article.");
  });

  it("removes runs of 3+ link-only lines pointing at relative URLs", () => {
    const input = [
      "Intro paragraph.",
      "",
      "[![Image 1](https://i.scdn.co/a)](/album/1)",
      "[Thriller](/album/1)",
      "[Bad](/album/2)",
      "[Dangerous](/album/3)",
      "",
      "Closing paragraph.",
    ].join("\n");
    const output = removeMarkdownNavigation(input);
    expect(output).toContain("Intro paragraph.");
    expect(output).toContain("Closing paragraph.");
    expect(output).not.toContain("/album/");
  });

  it("keeps short link-only runs and external citation links", () => {
    const input = [
      "See sources:",
      "[Source A](https://a.example.com)",
      "[Source B](https://b.example.com)",
      "[Source C](https://c.example.com)",
    ].join("\n");
    const output = removeMarkdownNavigation(input);
    expect(output).toContain("Source A");
    expect(output).toContain("Source C");
  });

  it("keeps links inside prose", () => {
    const input = "This mentions [a page](/internal/path) inside a sentence.";
    expect(removeMarkdownNavigation(input)).toBe(input);
  });

  it("leaves fenced code blocks untouched", () => {
    const input = [
      "```",
      "Title: not metadata, just code",
      "[a](/x)",
      "[b](/y)",
      "[c](/z)",
      "```",
    ].join("\n");
    const output = removeMarkdownNavigation(input);
    expect(output).toContain("Title: not metadata, just code");
    expect(output).toContain("[b](/y)");
  });

  it("handles empty and non-string input", () => {
    expect(removeMarkdownNavigation("")).toBe("");
    expect(removeMarkdownNavigation(null as any)).toBe("");
  });
});

describe("convertMarkdownToFormattedHTML", () => {
  it("converts linked images [![alt](src)](href)", () => {
    const html = convertMarkdownToFormattedHTML(
      "[![Cover](https://i.scdn.co/image/abc)](https://example.com/album/1)"
    );
    expect(html).toContain(
      '<a href="https://example.com/album/1"><img src="https://i.scdn.co/image/abc" alt="Cover" /></a>'
    );
  });

  it("converts images with empty alt text", () => {
    const html = convertMarkdownToFormattedHTML(
      "![](https://i.scdn.co/image/abc)"
    );
    expect(html).toContain('<img src="https://i.scdn.co/image/abc" alt="" />');
  });

  it("converts setext headers", () => {
    const html = convertMarkdownToFormattedHTML(
      "Page Title\n===============\n\nSection\n-------\n\nBody text."
    );
    expect(html).toContain("<h1>Page Title</h1>");
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<p>Body text.</p>");
  });

  it("still treats --- after a blank line as a horizontal rule", () => {
    const html = convertMarkdownToFormattedHTML("Some text.\n\n---\n\nMore.");
    expect(html).toContain("<hr>");
  });

  it("converts autolinks", () => {
    const html = convertMarkdownToFormattedHTML("Visit <https://example.com> now.");
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });

  it("converts pipe tables", () => {
    const html = convertMarkdownToFormattedHTML(
      "| Name | Year |\n| --- | --- |\n| Thriller | 1982 |\n| Bad | 1987 |"
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>Thriller</td>");
    expect(html).toContain("<td>1987</td>");
    expect(html).toContain("</table>");
  });

  it("applies inline markdown inside table cells", () => {
    const html = convertMarkdownToFormattedHTML(
      "| Album | Link |\n| --- | --- |\n| **Bad** | [play](/album/2) |"
    );
    expect(html).toContain("<strong>Bad</strong>");
    expect(html).toContain('<a href="/album/2">play</a>');
  });

  it("converts a JINA-style extraction end to end", () => {
    const jina = [
      "Michael Jackson",
      "===============",
      "",
      "The **King of Pop** released many albums.",
      "",
      "- [Thriller](https://open.spotify.com/album/1)",
      "- [Bad](https://open.spotify.com/album/2)",
    ].join("\n");
    const html = convertMarkdownToFormattedHTML(jina);
    expect(html).toContain("<h1>Michael Jackson</h1>");
    expect(html).toContain("<strong>King of Pop</strong>");
    expect(html).toContain('<li><a href="https://open.spotify.com/album/1">Thriller</a></li>');
    expect(html).not.toContain("](");
  });
});
