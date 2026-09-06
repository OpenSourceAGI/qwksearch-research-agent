/**
 * @fileoverview OCR of PDF pages with the Granite Docling vision model —
 * either in-process (via the optional `@huggingface/transformers` dependency
 * and the ONNX build of `ibm-granite/granite-docling-258M`) or by POSTing
 * page images to a docling-compatible HTTP processor (the Hono service in
 * this package's `server/` folder, or any other deployment of it).
 *
 * Everything heavy is imported lazily: requiring this module costs nothing
 * until a page is actually OCR'd.
 */

/** Hugging Face id of the ONNX Granite Docling build used for local OCR. */
const MODEL_ID = "onnx-community/granite-docling-258M-ONNX";

/** Default instruction sent to the model per page. */
const DEFAULT_PROMPT = "Convert this page to docling.";

/** Options accepted by the docling OCR helpers. */
export interface DoclingOcrOptions {
  /**
   * Base URL of a remote docling-compatible processor
   * (e.g. `"http://localhost:3000"`). When set, page images are POSTed to
   * `{processorUrl}/api/v1/convert-base64` instead of running the model
   * in-process.
   */
  processorUrl?: string;
  /** Instruction for the model. default="Convert this page to docling." */
  prompt?: string;
  /** Max tokens generated per page. default=4096 */
  maxTokens?: number;
  /** Rasterization scale for PDF pages (1 = 72 DPI). default=2 */
  scale?: number;
}

// ── Local model (optional @huggingface/transformers) ─────────────────────────

let localModelPromise: Promise<{ model: any; processor: any; lib: any }> | null =
  null;

/** Loads the Granite Docling ONNX model once and caches it. */
async function loadLocalModel() {
  if (!localModelPromise) {
    localModelPromise = (async () => {
      const lib = await import("@huggingface/transformers");
      const processor = await lib.AutoProcessor.from_pretrained(MODEL_ID);
      const model = await lib.AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        dtype: "fp32",
      });
      return { model, processor, lib };
    })();
  }
  return localModelPromise;
}

/**
 * OCRs one image with Granite Docling and returns the raw doctags output.
 * Uses the remote processor when `processorUrl` is set, otherwise the local
 * ONNX model.
 *
 * @param imageBase64 - Base64-encoded PNG of the page/image (no data: prefix)
 * @category Extract
 */
export async function ocrImageWithDocling(
  imageBase64: string,
  options: DoclingOcrOptions = {},
): Promise<string> {
  const {
    processorUrl,
    prompt = DEFAULT_PROMPT,
    maxTokens = 4096,
  } = options;

  if (processorUrl) {
    const response = await fetch(
      `${processorUrl.replace(/\/$/, "")}/api/v1/convert-base64`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: "image/png",
          prompt,
          maxTokens,
        }),
      },
    );
    const data: any = await response.json();
    if (!response.ok || !data?.success)
      throw new Error(data?.error || `Processor error ${response.status}`);
    return data.result;
  }

  const { model, processor, lib } = await loadLocalModel();
  const image = await lib.load_image(`data:image/png;base64,${imageBase64}`);
  const messages = [
    {
      role: "user",
      content: [{ type: "image" }, { type: "text", text: prompt }],
    },
  ];
  const text = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  const inputs = await processor(text, [image], { do_image_splitting: true });
  const generated_ids = await model.generate({
    ...inputs,
    max_new_tokens: maxTokens,
  });
  const [decoded] = processor.batch_decode(
    generated_ids.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  return decoded;
}

// ── Page rasterization ───────────────────────────────────────────────────────

/** Creates a 2D canvas in whatever environment is available. */
async function createCanvas(width: number, height: number): Promise<any> {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  try {
    const napi: any = await import("@napi-rs/canvas" as any);
    return napi.createCanvas(width, height);
  } catch {
    /* optional dependency not installed */
  }
  if (typeof OffscreenCanvas !== "undefined")
    return new OffscreenCanvas(width, height);
  throw new Error(
    "No canvas available to rasterize PDF pages — install @napi-rs/canvas in Node.js, or run in a browser/Worker with OffscreenCanvas",
  );
}

/** Encodes a canvas (DOM, Offscreen, or napi) as base64 PNG. */
async function canvasToPngBase64(canvas: any): Promise<string> {
  if (typeof canvas.toBuffer === "function")
    return canvas.toBuffer("image/png").toString("base64");
  if (typeof canvas.convertToBlob === "function") {
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  return canvas.toDataURL("image/png").split(",")[1];
}

/**
 * Rasterizes one PDF.js page object to a base64 PNG.
 * @param page - A page from `pdfDocument.getPage(n)`
 * @category Extract
 */
export async function renderPdfPageToPngBase64(
  page: any,
  scale = 2,
): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = await createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const canvasContext = canvas.getContext("2d");
  await page.render({ canvasContext, viewport }).promise;
  return canvasToPngBase64(canvas);
}

/**
 * OCRs a set of pages from a loaded PDF.js document with Granite Docling.
 *
 * @param pdfDocument - Document from PDF.js `getDocument(...).promise`
 * @param pageNumbers - 1-based page numbers to OCR
 * @returns Map of page number → HTML (converted from the model's doctags);
 *   pages whose OCR failed are absent from the map.
 * @category Extract
 */
export async function ocrPdfPagesWithDocling(
  pdfDocument: any,
  pageNumbers: number[],
  options: DoclingOcrOptions = {},
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  for (const pageNumber of pageNumbers) {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const imageBase64 = await renderPdfPageToPngBase64(page, options.scale);
      const doctags = await ocrImageWithDocling(imageBase64, options);
      results.set(pageNumber, doctagsToHtml(doctags));
    } catch (error) {
      console.error(`Docling OCR failed for page ${pageNumber}:`, error);
    }
  }
  return results;
}

// ── Doctags → HTML ───────────────────────────────────────────────────────────

/** Converts an OTSL table body (`<fcel>a<fcel>b<nl>...`) to an HTML table. */
function otslToHtmlTable(body: string): string {
  const rows = body
    .split("<nl>")
    .map((row) => row.trim())
    .filter(Boolean);
  const html = rows
    .map((row) => {
      const cells = [...row.matchAll(/<(fcel|ched|rhed|ecel|lcel|ucel|xcel)>([^<]*)/g)];
      if (!cells.length) return "";
      const cellsHtml = cells
        .map(([, kind, content]) => {
          const tag = kind === "ched" || kind === "rhed" ? "th" : "td";
          return `<${tag}>${content.trim()}</${tag}>`;
        })
        .join("");
      return `<tr>${cellsHtml}</tr>`;
    })
    .filter(Boolean)
    .join("");
  return `<table>${html}</table>`;
}

/**
 * Converts Granite Docling's doctags output to plain HTML: strips location
 * tokens, maps doctags elements (section headers, text, lists, code,
 * formulas, captions, OTSL tables) to their HTML equivalents, and drops page
 * furniture (running headers/footers). Best-effort — unknown tags are
 * removed, their text content kept.
 * @category Extract
 */
export function doctagsToHtml(doctags: string): string {
  let html = (doctags || "")
    // location / special tokens
    .replace(/<\/?doctag>/g, "")
    .replace(/<loc_\d+>/g, "")
    .replace(/<page_break>/g, "")
    .replace(/<end_of_utterance>/g, "")
    // page furniture carries no content value
    .replace(/<page_(?:header|footer)>[\s\S]*?<\/page_(?:header|footer)>/g, "");

  // OTSL tables
  html = html.replace(/<otsl>([\s\S]*?)<\/otsl>/g, (_, body) =>
    otslToHtmlTable(body),
  );

  const tagMap: Array<[RegExp, string, string]> = [
    [/<title>([\s\S]*?)<\/title>/g, "<h1>", "</h1>"],
    [/<section_header_level_1>([\s\S]*?)<\/section_header_level_1>/g, "<h2>", "</h2>"],
    [/<section_header_level_2>([\s\S]*?)<\/section_header_level_2>/g, "<h3>", "</h3>"],
    [/<section_header_level_3>([\s\S]*?)<\/section_header_level_3>/g, "<h4>", "</h4>"],
    [/<section_header_level_[4-9]>([\s\S]*?)<\/section_header_level_[4-9]>/g, "<h5>", "</h5>"],
    [/<(?:text|paragraph)>([\s\S]*?)<\/(?:text|paragraph)>/g, "<p>", "</p>"],
    [/<caption>([\s\S]*?)<\/caption>/g, "<figcaption>", "</figcaption>"],
    [/<(?:picture|chart)>([\s\S]*?)<\/(?:picture|chart)>/g, "<figure>", "</figure>"],
    [/<code>([\s\S]*?)<\/code>/g, "<pre><code>", "</code></pre>"],
    [/<formula>([\s\S]*?)<\/formula>/g, '<code class="formula">', "</code>"],
    [/<footnote>([\s\S]*?)<\/footnote>/g, '<p class="footnote">', "</p>"],
    [/<list_item>([\s\S]*?)<\/list_item>/g, "<li>", "</li>"],
    [/<unordered_list>([\s\S]*?)<\/unordered_list>/g, "<ul>", "</ul>"],
    [/<ordered_list>([\s\S]*?)<\/ordered_list>/g, "<ol>", "</ol>"],
  ];
  for (const [regex, open, close] of tagMap)
    html = html.replace(regex, (_, content) => `${open}${content.trim()}${close}`);

  // Drop any leftover doctags-style tokens, keeping their inner text.
  html = html.replace(/<\/?(?:[a-z][a-z0-9]*_[a-z0-9_]+|otsl|smiles)>/g, "");

  return html.trim();
}
