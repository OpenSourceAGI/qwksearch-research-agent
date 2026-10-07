import { NextRequest, NextResponse } from 'next/server';

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const maxBytes = Number(process.env.MAX_PDF_MB || '15') * 1024 * 1024;
  const url = new URL(request.url);
  const pdfUrl = url.searchParams.get('url');
  if (!pdfUrl) {
    return NextResponse.json({ error: 'Provide a `url` parameter.' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const pdf = await fetchPdf(pdfUrl, maxBytes);
    return new NextResponse(pdf, {
      headers: { 'Content-Type': 'application/pdf', ...CORS_HEADERS },
    });
  } catch (err) {
    const error = err as Error & { status?: number };
    return NextResponse.json({ error: error.message || String(err) }, { status: error.status || 500, headers: CORS_HEADERS });
  }
}