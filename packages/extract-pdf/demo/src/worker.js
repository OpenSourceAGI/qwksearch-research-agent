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
 *
 * Optional query/JSON/form flags: `addPageNumbers`, `addCitation`.
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
        return json({
          source,
          title: result.title,
          author: result.author,
          html: result.html,
          bytes,
          ms: Date.now() - started,
        });
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
