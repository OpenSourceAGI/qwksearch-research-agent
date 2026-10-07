import { NextRequest, NextResponse } from 'next/server';
import { convertPDFToHTML } from 'extract-pdf';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function readLimited(body: ReadableStream, maxBytes: number): Promise<ArrayBuffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`PDF is larger than ${maxBytes / 1024 / 1024} MB`);
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

async function fetchPdf(pdfUrl: string, maxBytes: number): Promise<ArrayBuffer> {
  const target = new URL(pdfUrl);
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    throw new Error('Only http(s) URLs are supported.');
  }
  const res = await fetch(target, {
    headers: { Accept: 'application/pdf,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetching the PDF failed with HTTP ${res.status}.`);
  return readLimited(res.body!, maxBytes);
}

function ocrSummary(scan: { pagesNeedingOcr?: number[]; pages?: { page: number; needsOcr: boolean; reasons: string[] }[] } | undefined, hasDocling: boolean): {
  needed: boolean;
  pageCount: number;
  pagesNeedingOcr: number[];
  reasons: Record<string, string[]>;
  enhance: { endpoint: string; maxPages: number } | null;
} {
  const pages = scan?.pagesNeedingOcr ?? [];
  const reasons: Record<string, string[]> = {};
  for (const page of scan?.pages ?? []) if (page.needsOcr) reasons[page.page] = page.reasons;
  return {
    needed: pages.length > 0,
    pageCount: scan?.pages?.length ?? 0,
    pagesNeedingOcr: pages,
    reasons,
    enhance: hasDocling
      ? { endpoint: '/api/enhance', maxPages: Number(process.env.DOCLING_MAX_PAGES || '10') }
      : null,
  };
}

function flag(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 'on';
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const maxBytes = Number(process.env.MAX_PDF_MB || '15') * 1024 * 1024;
  const hasDocling = Boolean(process.env.DOCLING_PROCESSOR_URL);

  const url = new URL(request.url);
  const pdfUrl = url.searchParams.get('url');
  if (!pdfUrl) {
    return NextResponse.json({ error: 'Provide a `url` parameter.' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const buffer = await fetchPdf(pdfUrl, maxBytes);
    const options = {
      addPageNumbers: flag(url.searchParams.get('addPageNumbers'), false),
      addCitation: flag(url.searchParams.get('addCitation'), true),
    };
    const started = Date.now();
    const result = await convertPDFToHTML(buffer, options);
    if (result?.error) return NextResponse.json({ error: result.error }, { status: 422, headers: CORS_HEADERS });

    const ocr = ocrSummary(result.ocrScan, hasDocling);
    return NextResponse.json({
      source: pdfUrl,
      status: ocr.needed && ocr.enhance ? 'ready_with_pending_ocr' : 'ready',
      title: result.title,
      author: result.author,
      html: result.html ?? '',
      bytes: buffer.byteLength,
      ms: Date.now() - started,
      ocr,
    }, { headers: CORS_HEADERS });
  } catch (err) {
    const error = err as Error & { status?: number };
    return NextResponse.json({ error: error.message || String(err) }, { status: error.status || 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const maxBytes = Number(process.env.MAX_PDF_MB || '15') * 1024 * 1024;
  const hasDocling = Boolean(process.env.DOCLING_PROCESSOR_URL);

  const contentType = request.headers.get('Content-Type') || '';
  let buffer: ArrayBuffer | undefined;
  let source = '';
  let options = { addPageNumbers: false, addCitation: true };

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        if (key === 'addPageNumbers') options.addPageNumbers = flag(value, false);
        else if (key === 'addCitation') options.addCitation = flag(value, true);
      }
    }
    if (file && typeof file !== 'string' && file.size > 0) {
      if (file.size > maxBytes) {
        return NextResponse.json({ error: `PDF is larger than ${maxBytes / 1024 / 1024} MB` }, { status: 413, headers: CORS_HEADERS });
      }
      buffer = await file.arrayBuffer();
      source = file.name || 'upload.pdf';
    }
  } else if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof json.addPageNumbers !== 'undefined') options.addPageNumbers = flag(json.addPageNumbers, false);
    if (typeof json.addCitation !== 'undefined') options.addCitation = flag(json.addCitation, true);
    if (typeof json.url === 'string' && json.url) {
      buffer = await fetchPdf(json.url, maxBytes);
      source = json.url;
    }
  } else if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
    buffer = await readLimited(request.body!, maxBytes);
    source = 'request body';
  }

  if (!buffer) {
    return NextResponse.json({ error: 'Provide a PDF file upload or a `url`.' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const started = Date.now();
    const result = await convertPDFToHTML(buffer, options);
    if (result?.error) return NextResponse.json({ error: result.error }, { status: 422, headers: CORS_HEADERS });

    const ocr = ocrSummary(result.ocrScan, hasDocling);
    return NextResponse.json({
      source,
      status: ocr.needed && ocr.enhance ? 'ready_with_pending_ocr' : 'ready',
      title: result.title,
      author: result.author,
      html: result.html ?? '',
      bytes: buffer.byteLength,
      ms: Date.now() - started,
      ocr,
    }, { headers: CORS_HEADERS });
  } catch (err) {
    const error = err as Error & { status?: number };
    return NextResponse.json({ error: error.message || String(err) }, { status: error.status || 500, headers: CORS_HEADERS });
  }
}