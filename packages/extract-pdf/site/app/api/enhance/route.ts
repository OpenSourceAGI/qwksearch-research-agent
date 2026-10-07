import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const doclingUrl = process.env.DOCLING_PROCESSOR_URL;
  if (!doclingUrl) {
    return NextResponse.json({ error: 'OCR enhancement is not configured (DOCLING_PROCESSOR_URL).' }, { status: 503, headers: CORS_HEADERS });
  }

  const maxImageBytes = Number(process.env.DOCLING_MAX_IMAGE_MB || '8') * 1024 * 1024;
  const declared = Number(request.headers.get('Content-Length') || '0');
  if (declared > (maxImageBytes * 4) / 3 + 4096) {
    return NextResponse.json({ error: 'Page image is too large.' }, { status: 413, headers: CORS_HEADERS });
  }

  let body: { page?: unknown; imageBase64?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers: CORS_HEADERS });
  }

  const page = Number(body?.page);
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: '`page` must be a page number.' }, { status: 400, headers: CORS_HEADERS });
  }

  const imageBase64 = body?.imageBase64;
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ error: 'Provide `imageBase64`.' }, { status: 400, headers: CORS_HEADERS });
  }
  if ((imageBase64.length * 3) / 4 > maxImageBytes) {
    return NextResponse.json({ error: 'Page image is too large.' }, { status: 413, headers: CORS_HEADERS });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.DOCLING_API_TOKEN) headers['X-Docling-Token'] = process.env.DOCLING_API_TOKEN;
  if (process.env.HF_SPACE_TOKEN) headers.Authorization = `Bearer ${process.env.HF_SPACE_TOKEN}`;

  const started = Date.now();
  try {
    const res = await fetch(`${doclingUrl.replace(/\/+$/, '')}/api/v1/convert-base64`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64,
        mimeType: 'image/png',
        maxTokens: Number(process.env.DOCLING_MAX_TOKENS || '1500'),
        output: 'html',
      }),
    });

    const out = (await res.json().catch(() => null)) as { success?: boolean; result?: string; error?: string } | null;
    if (!res.ok || !out?.success) {
      const status = res.status === 503 ? 503 : 502;
      return NextResponse.json({ error: `Docling processor: ${out?.error || `HTTP ${res.status}`}` }, { status, headers: CORS_HEADERS });
    }

    return NextResponse.json({ page, html: out.result ?? '', ms: Date.now() - started }, { headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json({ error: `Docling processor request failed: ${(err as Error).message}` }, { status: 502, headers: CORS_HEADERS });
  }
}