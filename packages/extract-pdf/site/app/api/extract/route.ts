import { NextRequest, NextResponse } from 'next/server';
import { extractContent } from 'extract-webpage/url-to-content/url-to-content';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function flag(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 'on';
}

function checkHttpUrl(value: string): URL {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error('`url` is not a valid URL.');
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') throw new Error('Only http(s) URLs are supported.');
  return target;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pageUrl = url.searchParams.get('url');
  const options = {
    images: flag(url.searchParams.get('images'), true),
    links: flag(url.searchParams.get('links'), true),
    formatting: flag(url.searchParams.get('formatting'), true),
    timeout: 10,
  };

  if (!pageUrl) {
    return NextResponse.json({ error: 'Provide a `url` parameter.' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    checkHttpUrl(pageUrl);
    const started = Date.now();
    const article = await extractContent(pageUrl, options);

    if (!article || article.error || !article.html) {
      return NextResponse.json({ error: `Could not extract this page${article?.error ? `: ${article.error}` : '.'}` }, { status: 422, headers: CORS_HEADERS });
    }

    return NextResponse.json({
      input: pageUrl,
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
    }, { headers: CORS_HEADERS });
  } catch (err) {
    const error = err as Error & { status?: number };
    return NextResponse.json({ error: error.message || String(err) }, { status: error.status || 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const maxHtmlBytes = Number(process.env.MAX_HTML_MB || '2') * 1024 * 1024;
  const declared = Number(request.headers.get('Content-Length') || '0');
  if (declared > maxHtmlBytes) {
    return NextResponse.json({ error: `Body is larger than ${maxHtmlBytes / 1024 / 1024} MB` }, { status: 413, headers: CORS_HEADERS });
  }

  const text = await request.text();
  if (text.length > maxHtmlBytes) {
    return NextResponse.json({ error: `Body is larger than ${maxHtmlBytes / 1024 / 1024} MB` }, { status: 413, headers: CORS_HEADERS });
  }

  let fields: Record<string, unknown> = {};
  try {
    fields = { ...fields, ...(JSON.parse(text) as Record<string, unknown>) };
  } catch {
    return NextResponse.json({ error: 'Send JSON: `{ "url": "…" }` or `{ "html": "…", "url": "…" }`.' }, { status: 400, headers: CORS_HEADERS });
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

  try {
    if (html.trim()) {
      if (pageUrl) checkHttpUrl(pageUrl);
      input = pageUrl || 'pasted HTML';
      article = await extractContent(html.trimStart(), { ...options, url: pageUrl });
    } else if (pageUrl) {
      checkHttpUrl(pageUrl);
      input = pageUrl;
      article = await extractContent(pageUrl, options);
    } else {
      return NextResponse.json({ error: 'Provide a `url`, or `html` to extract from.' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!article || article.error || !article.html) {
      return NextResponse.json({ error: `Could not extract this page${article?.error ? `: ${article.error}` : '.'}` }, { status: 422, headers: CORS_HEADERS });
    }

    return NextResponse.json({
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
    }, { headers: CORS_HEADERS });
  } catch (err) {
    const error = err as Error & { status?: number };
    return NextResponse.json({ error: error.message || String(err) }, { status: error.status || 500, headers: CORS_HEADERS });
  }
}