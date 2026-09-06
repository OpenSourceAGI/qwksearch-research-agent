import { describe, it, expect } from "bun:test";
import { doctagsToHtml } from "../src/docling-ocr";

describe("doctagsToHtml", () => {
  it("strips doctag wrapper and location tokens", () => {
    const html = doctagsToHtml(
      "<doctag><text><loc_12><loc_34>Hello world</text></doctag>",
    );
    expect(html).toBe("<p>Hello world</p>");
  });

  it("maps titles and section headers to heading levels", () => {
    const html = doctagsToHtml(
      "<title>Paper Title</title><section_header_level_1>Intro</section_header_level_1><section_header_level_2>Sub</section_header_level_2>",
    );
    expect(html).toContain("<h1>Paper Title</h1>");
    expect(html).toContain("<h2>Intro</h2>");
    expect(html).toContain("<h3>Sub</h3>");
  });

  it("converts OTSL tables to HTML tables with headers", () => {
    const html = doctagsToHtml(
      "<otsl><ched>Region<ched>Q1<nl><fcel>North<fcel>10.5<nl><fcel>South<fcel>8.2<nl></otsl>",
    );
    expect(html).toBe(
      "<table><tr><th>Region</th><th>Q1</th></tr><tr><td>North</td><td>10.5</td></tr><tr><td>South</td><td>8.2</td></tr></table>",
    );
  });

  it("maps lists, code, formulas and captions", () => {
    const html = doctagsToHtml(
      "<unordered_list><list_item>one</list_item><list_item>two</list_item></unordered_list><code>x = 1</code><formula>E=mc^2</formula><caption>Figure 1</caption>",
    );
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<pre><code>x = 1</code></pre>");
    expect(html).toContain('<code class="formula">E=mc^2</code>');
    expect(html).toContain("<figcaption>Figure 1</figcaption>");
  });

  it("drops page headers/footers and unknown doctags tokens", () => {
    const html = doctagsToHtml(
      "<page_header>Running head</page_header><text>Body</text><page_footer>3</page_footer><smiles>CCO</smiles>",
    );
    expect(html).toBe("<p>Body</p>CCO");
  });

  it("returns empty string for empty input", () => {
    expect(doctagsToHtml("")).toBe("");
  });
});
