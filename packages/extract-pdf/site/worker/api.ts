/**
 * @file api.ts
 * @description The live demo's API, served by this site's Worker
 * (`worker/index.ts`) ahead of the docs, and by the dev-server middleware in
 * `vite.config.ts` under `vinext dev`. Every other path falls through to the
 * docs (vinext).
 *
 * Routes:
 *   GET  /api/health                liveness check, and the limits the demo
 *                                   page shows (`maxPdfMb`, `ocr`)
 *   GET  /api/convert?url=...       convert a PDF at a public URL (extract-pdf)
 *   POST /api/convert               multipart form (`file` or `url` field),
 *                                   JSON `{ url }`, or a raw application/pdf body
 *   POST /api/enhance               OCR one page image with the remote Docling
 *                                   processor (JSON `{ page, imageBase64 }`)
 *   GET  /api/source?url=...        the PDF at `url`, for the page to rasterize
 *   GET  /api/extract?url=...       a webpage → article HTML + citation
 *                                   (extract-webpage's `extractContent`)
 *   POST /api/extract               JSON `{ url }` or `{ html, url? }`
 *   /api/admin/*                    the admin panel's login and global keys (worker/admin.ts)
 *   POST /api/cite                  JSON `{ url, apiKey?, model?, styles?, html? }` →
 *                                   a full citation from an LLM (extract-cite)
 *
 * /api/convert flags: `addPageNumbers`, `addCitation` (query, JSON or form).
 * /api/extract flags: `images`, `links`, `formatting`.
 *
 * /api/convert always answers with the fast text-layer HTML. It never waits
 * for OCR: it reports which pages the scan flagged, and when a Docling
 * processor is configured (DOCLING_PROCESSOR_URL, see ../docling-space) the
 * demo page renders those pages in the browser and sends each image to
 * /api/enhance, which forwards it with the secrets the browser never sees.
 */
import { handleAdmin, withStoredSettings, type AdminEnv } from './admin';
import { convertPDFToHTML } from 'extract-pdf';
import { extractContent } from 'extract-webpage/url-to-content/url-to-content';
import {
  CITATION_STYLES,
  CiteLLMError,
  extractCiteLLM,
  type CitationStyle,
  type ExtractCiteLLMResult,
} from 'extract-cite';

export interface Env extends AdminEnv {
  /** Largest PDF (in MB) accepted, by upload or by URL. Default 15. */
  MAX_PDF_MB?: string;
  /** Largest pasted HTML (in MB) /api/extract accepts. Default 2. */
  MAX_HTML_MB?: string;
  /** Granite Docling processor, e.g. https://USER-extract-pdf-docling.hf.space. Unset: no OCR follow-up. */
  DOCLING_PROCESSOR_URL?: string;
  /** Sent as `X-Docling-Token`; the Space's own DOCLING_API_TOKEN secret. */
  DOCLING_API_TOKEN?: string;
  /** Private Space only: a Hugging Face read token, sent as a bearer token. */
  HF_SPACE_TOKEN?: string;
  DOCLING_MAX_PAGES?: string;
  DOCLING_MAX_TOKENS?: string;
  DOCLING_MAX_IMAGE_MB?: string;
  /** OpenRouter key /api/cite uses when the request brings none. Unset: visitors must bring their own. */
  OPENROUTER_API_KEY?: string;
  /** Default model for /api/cite. Default: extract-cite's own. */
  CITE_MODEL?: string;
}

/** A /api/health response. */
export interface HealthResponse {
  status: 'ok';
  /** Largest PDF the demo accepts, in MB. */
  maxPdfMb: number;
  /** Whether /api/enhance has a Docling processor to call. */
  ocr: boolean;
  /** Whether /api/cite has a server-side key, so the demo can leave the key field optional. */
  cite: boolean;
}

/** The OCR part of a /api/convert response. */
export interface OcrSummary {
  needed: boolean;
  pageCount: number;
  pagesNeedingOcr: number[];
  reasons: Record<string, string[]>;
  enhance: { endpoint: string; maxPages: number } | null;
}

/** A /api/convert response. */
export interface ConvertResponse {
  source: string;
  status: 'ready' | 'ready_with_pending_ocr';
  title?: string;
  author?: string;
  html: string;
  bytes: number;
  ms: number;
  ocr: OcrSummary;
}

/** A /api/extract response: extract-webpage's article, plus where it came from. */
export interface ExtractResponse {
  input: string;
  ms: number;
  title?: string;
  author?: string;
  author_cite?: string;
  date?: string;
  source?: string;
  cite?: string;
  url?: string;
  word_count?: number;
  html: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Fields = Record<string, unknown>;

/**
 * Answers the demo's `/api/*` routes, or returns `null` for any other path so
 * the caller can hand the request to the docs.
 */
export async function handleApi(request: Request, workerEnv: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  // The admin panel's own routes: same-origin only, no CORS.
  if (url.pathname.startsWith('/api/admin/')) return handleAdmin(request, url, workerEnv);

  // Global keys saved in the admin panel sit over the Worker's own vars.
  const env = await withStoredSettings(workerEnv);

  const maxBytes = Number(env.MAX_PDF_MB || 15) * 1024 * 1024;

  try {
    switch (url.pathname) {
      case '/api/health': {
        const body: HealthResponse = {
          status: 'ok',
          maxPdfMb: maxBytes / 1024 / 1024,
          ocr: Boolean(env.DOCLING_PROCESSOR_URL),
          cite: Boolean(env.OPENROUTER_API_KEY),
        };
        return json(body);
      }

      case '/api/convert': {
        if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        const { buffer, options, source } = await readPdfInput(request, url, maxBytes);
        const bytes = buffer.byteLength; // pdf.js detaches the buffer
        const started = Date.now();
        const result = await convertPDFToHTML(buffer, options);
        if (result?.error) return json({ error: result.error }, 422);
        const ocr = ocrSummary(result.ocrScan, env);
        const body: ConvertResponse = {
          source,
          status: ocr.needed && ocr.enhance ? 'ready_with_pending_ocr' : 'ready',
          title: result.title,
          author: result.author,
          html: result.html ?? '',
          bytes,
          ms: Date.now() - started,
          ocr,
        };
        return json(body);
      }

      case '/api/enhance':
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        return json(await enhancePage(request, env));

      case '/api/source': {
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const target = url.searchParams.get('url');
        if (!target) throw httpError(400, 'Provide a `url`.');
        const pdf = await fetchPdf(target, maxBytes);
        return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', ...CORS_HEADERS } });
      }

      case '/api/extract':
        if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        return json(await extractWebpage(request, url, env));

      case '/api/cite':
        // POST only: the visitor's API key travels in the body, never the URL.
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        return json(await citePage(request, env));

      default:
        return json({ error: 'Not found' }, 404);
    }
  } catch (err) {
    const error = err as Error & { status?: number };
    return json({ error: error.message || String(err) }, error.status || 500);
  }
}

/**
 * Pulls the PDF bytes and conversion flags out of any supported request shape.
 */
async function readPdfInput(
  request: Request,
  url: URL,
  maxBytes: number,
): Promise<{ buffer: ArrayBuffer; options: { addPageNumbers: boolean; addCitation: boolean }; source: string }> {
  const type = request.headers.get('Content-Type') || '';
  let fields: Fields = Object.fromEntries(url.searchParams);
  let buffer: ArrayBuffer | undefined;
  let source = '';

  if (request.method === 'POST') {
    if (type.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      for (const [key, value] of form) if (typeof value === 'string') fields[key] = value;
      if (file && typeof file !== 'string' && file.size > 0) {
        if (file.size > maxBytes) throw httpError(413, `PDF is larger than ${maxBytes / 1024 / 1024} MB`);
        buffer = await file.arrayBuffer();
        source = file.name || 'upload.pdf';
      }
    } else if (type.includes('application/json')) {
      fields = { ...fields, ...((await request.json()) as Fields) };
    } else if (type.includes('application/pdf') || type.includes('application/octet-stream')) {
      buffer = await readLimited(request, maxBytes);
      source = 'request body';
    }
  }

  if (!buffer) {
    if (typeof fields.url !== 'string' || !fields.url) throw httpError(400, 'Provide a PDF file upload or a `url`.');
    buffer = await fetchPdf(fields.url, maxBytes);
    source = fields.url;
  }

  const options = {
    addPageNumbers: flag(fields.addPageNumbers, false),
    addCitation: flag(fields.addCitation, true),
  };
  return { buffer, options, source };
}

interface OcrScan {
  pagesNeedingOcr?: number[];
  pages?: { page: number; needsOcr: boolean; reasons: string[] }[];
}

/**
 * The OCR part of a /api/convert response: which pages the text-layer scan
 * flagged and why, and whether /api/enhance can OCR them.
 */
function ocrSummary(scan: OcrScan | undefined, env: Env): OcrSummary {
  const pages = scan?.pagesNeedingOcr ?? [];
  const reasons: Record<string, string[]> = {};
  for (const page of scan?.pages ?? []) if (page.needsOcr) reasons[page.page] = page.reasons;
  return {
    needed: pages.length > 0,
    pageCount: scan?.pages?.length ?? 0,
    pagesNeedingOcr: pages,
    reasons,
    enhance: env.DOCLING_PROCESSOR_URL
      ? { endpoint: '/api/enhance', maxPages: Number(env.DOCLING_MAX_PAGES || 10) }
      : null,
  };
}

/**
 * Forwards one rasterized page to the Docling processor and returns its
 * sanitized HTML. The service token (and, for a private Hugging Face Space,
 * an HF read token) are Worker secrets and stay server-side.
 */
async function enhancePage(request: Request, env: Env): Promise<{ page: number; html: string; ms: number }> {
  if (!env.DOCLING_PROCESSOR_URL) throw httpError(503, 'OCR enhancement is not configured (DOCLING_PROCESSOR_URL).');
  const maxImageBytes = Number(env.DOCLING_MAX_IMAGE_MB || 8) * 1024 * 1024;
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > (maxImageBytes * 4) / 3 + 4096) throw httpError(413, 'Page image is too large.');

  const body = (await request.json().catch(() => null)) as { page?: unknown; imageBase64?: unknown } | null;
  const page = Number(body?.page);
  if (!Number.isInteger(page) || page < 1) throw httpError(400, '`page` must be a page number.');
  const imageBase64 = body?.imageBase64;
  if (typeof imageBase64 !== 'string' || !imageBase64) throw httpError(400, 'Provide `imageBase64`.');
  if ((imageBase64.length * 3) / 4 > maxImageBytes) throw httpError(413, 'Page image is too large.');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.DOCLING_API_TOKEN) headers['X-Docling-Token'] = env.DOCLING_API_TOKEN;
  if (env.HF_SPACE_TOKEN) headers.Authorization = `Bearer ${env.HF_SPACE_TOKEN}`;

  const started = Date.now();
  const res = await fetch(`${env.DOCLING_PROCESSOR_URL.replace(/\/+$/, '')}/api/v1/convert-base64`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageBase64,
      mimeType: 'image/png',
      maxTokens: Number(env.DOCLING_MAX_TOKENS || 1500),
      output: 'html',
    }),
  });
  const out = (await res.json().catch(() => null)) as { success?: boolean; result?: string; error?: string } | null;
  if (!res.ok || !out?.success) {
    const status = res.status === 503 ? 503 : 502;
    throw httpError(status, `Docling processor: ${out?.error || `HTTP ${res.status}`}`);
  }
  return { page, html: out.result ?? '', ms: Date.now() - started };
}

/**
 * A webpage (by URL, or pasted HTML) → its main content as basic HTML, plus
 * citation fields. A URL that turns out to be a PDF goes through extract-pdf,
 * and a YouTube URL through extract-youtube, inside `extractContent`.
 */
async function extractWebpage(request: Request, url: URL, env: Env): Promise<ExtractResponse> {
  let fields: Fields = Object.fromEntries(url.searchParams);
  if (request.method === 'POST') {
    const maxHtmlBytes = Number(env.MAX_HTML_MB || 2) * 1024 * 1024;
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > maxHtmlBytes) throw httpError(413, `Body is larger than ${maxHtmlBytes / 1024 / 1024} MB`);
    const text = await request.text();
    if (text.length > maxHtmlBytes) throw httpError(413, `Body is larger than ${maxHtmlBytes / 1024 / 1024} MB`);
    try {
      fields = { ...fields, ...(JSON.parse(text) as Fields) };
    } catch {
      throw httpError(400, 'Send JSON: `{ "url": "…" }` or `{ "html": "…", "url": "…" }`.');
    }
  }

  const options = {
    images: flag(fields.images, true),
    links: flag(fields.links, true),
    formatting: flag(fields.formatting, true),
    timeout: 10,
  };
  const pageUrl = typeof fields.url === 'string' ? fields.url.trim() : '';
  const html = typeof fields.html === 'string' ? fields.html : '';

  let input: string;
  let article: Awaited<ReturnType<typeof extractContent>>;
  const started = Date.now();
  if (html.trim()) {
    if (pageUrl) checkHttpUrl(pageUrl);
    input = pageUrl || 'pasted HTML';
    // extractContent reads a string as a URL only when it starts with "http".
    article = await extractContent(html.trimStart(), { ...options, url: pageUrl });
  } else if (pageUrl) {
    checkHttpUrl(pageUrl);
    input = pageUrl;
    article = await extractContent(pageUrl, options);
  } else {
    throw httpError(400, 'Provide a `url`, or `html` to extract from.');
  }

  if (!article || article.error || !article.html) {
    throw httpError(422, `Could not extract this page${article?.error ? `: ${article.error}` : '.'}`);
  }
  return {
    input,
    ms: Date.now() - started,
    title: article.title,
    author: article.author,
    author_cite: article.author_cite,
    date: article.date,
    source: article.source,
    cite: article.cite,
    url: article.url,
    word_count: article.word_count,
    html: article.html,
  };
}

/** A /api/cite response: extract-cite's result, plus where it came from. */
export type CiteResponse = ExtractCiteLLMResult & { input: string };

/**
 * A webpage (URL, or pasted HTML) → a full citation: the regex pass, then one
 * model call that completes the APA parts, scores them and reads the author
 * bios. The key comes from the request or the Worker's OPENROUTER_API_KEY; it
 * is passed to the provider and never stored or echoed.
 */
async function citePage(request: Request, env: Env): Promise<CiteResponse> {
  const maxHtmlBytes = Number(env.MAX_HTML_MB || 2) * 1024 * 1024;
  const text = await request.text();
  if (text.length > maxHtmlBytes) throw httpError(413, `Body is larger than ${maxHtmlBytes / 1024 / 1024} MB`);
  let fields: Fields;
  try {
    fields = JSON.parse(text) as Fields;
  } catch {
    throw httpError(400, 'Send JSON: `{ "url": "…", "apiKey": "…", "model": "…" }`.');
  }

  const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const pageUrl = str(fields.url);
  const html = typeof fields.html === 'string' ? fields.html : '';
  if (pageUrl) checkHttpUrl(pageUrl);
  if (!pageUrl && !html.trim()) throw httpError(400, 'Provide a `url`, or `html` to cite.');

  const apiKey = str(fields.apiKey) || env.OPENROUTER_API_KEY;
  if (!apiKey) throw httpError(401, 'Paste an OpenRouter API key: this demo has no server-side key.');
  const styles = Array.isArray(fields.styles)
    ? (fields.styles.filter((style): style is CitationStyle => CITATION_STYLES.includes(style as CitationStyle)))
    : undefined;

  try {
    const result = await extractCiteLLM({
      url: pageUrl || undefined,
      html: html.trim() ? html : undefined,
      apiKey,
      model: str(fields.model) || env.CITE_MODEL || undefined,
      styles: styles?.length ? styles : undefined,
    });
    return { input: pageUrl || 'pasted HTML', ...result };
  } catch (err) {
    if (err instanceof CiteLLMError) throw httpError(err.status === 401 || err.status === 402 || err.status === 429 ? err.status : 502, err.message);
    throw httpError(502, (err as Error).message);
  }
}

function checkHttpUrl(value: string): URL {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw httpError(400, '`url` is not a valid URL.');
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') throw httpError(400, 'Only http(s) URLs are supported.');
  return target;
}

/** Downloads a PDF from a public http(s) URL, enforcing the size limit. */
async function fetchPdf(pdfUrl: string, maxBytes: number): Promise<ArrayBuffer> {
  const target = checkHttpUrl(pdfUrl);
  const res = await fetch(target, {
    headers: { Accept: 'application/pdf,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw httpError(502, `Fetching the PDF failed with HTTP ${res.status}.`);
  return readLimited(res, maxBytes);
}

/** Reads a Request/Response body into an ArrayBuffer, aborting past maxBytes. */
async function readLimited(message: Request | Response, maxBytes: number): Promise<ArrayBuffer> {
  const declared = Number(message.headers.get('Content-Length') || 0);
  if (declared > maxBytes) throw httpError(413, `PDF is larger than ${maxBytes / 1024 / 1024} MB`);
  if (!message.body) throw httpError(400, 'Empty body.');

  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
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

function flag(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 'on';
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}
