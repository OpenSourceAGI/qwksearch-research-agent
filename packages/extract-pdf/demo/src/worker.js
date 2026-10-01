/**
 * @file worker.js
 * @description Cloudflare Worker demo for extract-pdf. Serves a small upload
 * page at `/` and converts PDFs to structured HTML at `/api/convert`.
 *
 * Routes:
 *   GET  /                      demo page
 *   GET  /health                liveness check
 *   GET  /api/convert?url=...   convert a PDF at a public URL
 *   POST /api/convert           multipart form (`file` or `url` field),
 *                               JSON `{ url }`, or a raw application/pdf body
 *   POST /api/enhance           OCR one page image with the remote Docling
 *                               processor (JSON `{ page, imageBase64 }`)
 *   GET  /api/source?url=...    the PDF at `url`, for the page to rasterize
 *
 * Optional query/JSON/form flags: `addPageNumbers`, `addCitation`.
 *
 * /api/convert always answers with the fast text-layer HTML. It never waits
 * for OCR: it reports which pages the scan flagged, and when a Docling
 * processor is configured (DOCLING_PROCESSOR_URL, see docling-space/) the
 * page renders those pages in the browser and sends each image to
 * /api/enhance, which forwards it with the secrets the browser never sees.
 */
import { convertPDFToHTML } from "extract-pdf";
import { renderPage } from "./page.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const maxBytes = Number(env.MAX_PDF_MB || 15) * 1024 * 1024;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(renderPage({ maxMb: maxBytes / 1024 / 1024 }), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (url.pathname === "/api/convert") {
      if (request.method !== "GET" && request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      try {
        const { buffer, options, source } = await readInput(request, url, maxBytes);
        const bytes = buffer.byteLength; // pdf.js detaches the buffer
        const started = Date.now();
        const result = await convertPDFToHTML(buffer, options);
        if (result?.error) return json({ error: result.error }, 422);
        const ocr = ocrSummary(result.ocrScan, env);
        return json({
          source,
          status: ocr.needed && ocr.enhance ? "ready_with_pending_ocr" : "ready",
          title: result.title,
          author: result.author,
          html: result.html,
          bytes,
          ms: Date.now() - started,
          ocr,
        });
      } catch (err) {
        return json({ error: err.message || String(err) }, err.status || 500);
      }
    }

    if (url.pathname === "/api/enhance") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      try {
        return json(await enhancePage(request, env));
      } catch (err) {
        return json({ error: err.message || String(err) }, err.status || 500);
      }
    }

    if (url.pathname === "/api/source") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      try {
        if (!url.searchParams.get("url")) throw httpError(400, "Provide a `url`.");
        const pdf = await fetchPdf(url.searchParams.get("url"), maxBytes);
        return new Response(pdf, { headers: { "Content-Type": "application/pdf", ...CORS_HEADERS } });
      } catch (err) {
        return json({ error: err.message || String(err) }, err.status || 500);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};

/**
 * Pulls the PDF bytes and conversion flags out of any supported request shape.
 * @returns {Promise<{buffer: ArrayBuffer, options: object, source: string}>}
 */
async function readInput(request, url, maxBytes) {
  const type = request.headers.get("Content-Type") || "";
  let fields = Object.fromEntries(url.searchParams);
  let buffer;
  let source;

  if (request.method === "POST") {
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      fields = { ...fields, ...Object.fromEntries([...form].filter(([, v]) => typeof v === "string")) };
      if (file && typeof file !== "string" && file.size > 0) {
        if (file.size > maxBytes) throw httpError(413, `PDF is larger than ${maxBytes / 1024 / 1024} MB`);
        buffer = await file.arrayBuffer();
        source = file.name || "upload.pdf";
      }
    } else if (type.includes("application/json")) {
      fields = { ...fields, ...(await request.json()) };
    } else if (type.includes("application/pdf") || type.includes("application/octet-stream")) {
      buffer = await readLimited(request, maxBytes);
      source = "request body";
    }
  }

  if (!buffer) {
    if (!fields.url) throw httpError(400, "Provide a PDF file upload or a `url`.");
    buffer = await fetchPdf(fields.url, maxBytes);
    source = fields.url;
  }

  const options = {
    addPageNumbers: flag(fields.addPageNumbers, false),
    addCitation: flag(fields.addCitation, true),
  };
  return { buffer, options, source };
}

/**
 * The OCR part of a /api/convert response: which pages the text-layer scan
 * flagged and why, and whether /api/enhance can OCR them.
 */
function ocrSummary(scan, env) {
  const pages = scan?.pagesNeedingOcr ?? [];
  const reasons = {};
  for (const page of scan?.pages ?? []) if (page.needsOcr) reasons[page.page] = page.reasons;
  return {
    needed: pages.length > 0,
    pageCount: scan?.pages?.length ?? 0,
    pagesNeedingOcr: pages,
    reasons,
    enhance: env.DOCLING_PROCESSOR_URL
      ? { endpoint: "/api/enhance", maxPages: Number(env.DOCLING_MAX_PAGES || 10) }
      : null,
  };
}

/**
 * Forwards one rasterized page to the Docling processor and returns its
 * sanitized HTML. The service token (and, for a private Hugging Face Space,
 * an HF read token) are Worker secrets and stay server-side.
 */
async function enhancePage(request, env) {
  if (!env.DOCLING_PROCESSOR_URL) throw httpError(503, "OCR enhancement is not configured (DOCLING_PROCESSOR_URL).");
  const maxImageBytes = Number(env.DOCLING_MAX_IMAGE_MB || 8) * 1024 * 1024;
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > (maxImageBytes * 4) / 3 + 4096) throw httpError(413, "Page image is too large.");

  const body = await request.json().catch(() => null);
  const page = Number(body?.page);
  if (!Number.isInteger(page) || page < 1) throw httpError(400, "`page` must be a page number.");
  if (typeof body.imageBase64 !== "string" || !body.imageBase64) throw httpError(400, "Provide `imageBase64`.");
  if ((body.imageBase64.length * 3) / 4 > maxImageBytes) throw httpError(413, "Page image is too large.");

  const headers = { "Content-Type": "application/json" };
  if (env.DOCLING_API_TOKEN) headers["X-Docling-Token"] = env.DOCLING_API_TOKEN;
  if (env.HF_SPACE_TOKEN) headers.Authorization = `Bearer ${env.HF_SPACE_TOKEN}`;

  const started = Date.now();
  const res = await fetch(`${env.DOCLING_PROCESSOR_URL.replace(/\/+$/, "")}/api/v1/convert-base64`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      imageBase64: body.imageBase64,
      mimeType: "image/png",
      maxTokens: Number(env.DOCLING_MAX_TOKENS || 1500),
      output: "html",
    }),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out?.success) {
    const status = res.status === 503 ? 503 : 502;
    throw httpError(status, `Docling processor: ${out?.error || `HTTP ${res.status}`}`);
  }
  return { page, html: out.result, ms: Date.now() - started };
}

/** Downloads a PDF from a public http(s) URL, enforcing the size limit. */
async function fetchPdf(pdfUrl, maxBytes) {
  let target;
  try {
    target = new URL(pdfUrl);
  } catch {
    throw httpError(400, "`url` is not a valid URL.");
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    throw httpError(400, "Only http(s) URLs are supported.");
  }
  const res = await fetch(target, {
    headers: { Accept: "application/pdf,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw httpError(502, `Fetching the PDF failed with HTTP ${res.status}.`);
  return readLimited(res, maxBytes);
}

/** Reads a Request/Response body into an ArrayBuffer, aborting past maxBytes. */
async function readLimited(message, maxBytes) {
  const declared = Number(message.headers.get("Content-Length") || 0);
  if (declared > maxBytes) throw httpError(413, `PDF is larger than ${maxBytes / 1024 / 1024} MB`);
  if (!message.body) throw httpError(400, "Empty body.");

  const reader = message.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw httpError(413, `PDF is larger than ${maxBytes / 1024 / 1024} MB`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

function flag(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1" || value === "on";
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}
