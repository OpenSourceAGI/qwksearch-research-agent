import { afterEach, describe, it, expect } from "bun:test";
import { doctagsToHtml, ocrImageWithDocling } from "../src/docling-ocr";

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

describe("ocrImageWithDocling with a remote processor", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function mockFetch(status: number, body: string) {
    const calls: Array<{ url: string; init: any }> = [];
    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return new Response(body, { status });
    }) as any;
    return calls;
  }

  it("POSTs to convert-base64 with processorHeaders and asks for doctags", async () => {
    const calls = mockFetch(
      200,
      JSON.stringify({ success: true, result: "<text>Hi</text>" }),
    );
    const doctags = await ocrImageWithDocling("iVBORw0KGgo=", {
      processorUrl: "https://me-extract-pdf-docling.hf.space/",
      processorHeaders: {
        "X-Docling-Token": "service-token",
        Authorization: "Bearer hf_space_token",
      },
      maxTokens: 1500,
    });
    expect(doctags).toBe("<text>Hi</text>");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://me-extract-pdf-docling.hf.space/api/v1/convert-base64",
    );
    expect(calls[0].init.headers).toEqual({
      "X-Docling-Token": "service-token",
      Authorization: "Bearer hf_space_token",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(calls[0].init.body);
    expect(body).toMatchObject({
      imageBase64: "iVBORw0KGgo=",
      mimeType: "image/png",
      maxTokens: 1500,
      output: "doctags",
    });
  });

  it("reports the HTTP status when the processor answers with a non-JSON error page", async () => {
    mockFetch(401, "<html>Unauthorized</html>");
    await expect(
      ocrImageWithDocling("iVBORw0KGgo=", { processorUrl: "https://x.hf.space" }),
    ).rejects.toThrow("Processor error 401");
  });
});
