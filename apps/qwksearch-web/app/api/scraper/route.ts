/**
 * @fileoverview API route for web page rendering with Cloudflare Browser.
 * Provides a Next.js API endpoint that proxies requests to the scraper service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderWithCloudflare, type ScraperOptions } from '@/lib/scraper';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * POST /api/scraper
 *
 * Renders a web page using Cloudflare Browser Rendering.
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/scraper', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     url: 'https://example.com',
 *     blockImages: true,
 *     bypassCaptcha: true
 *   })
 * });
 *
 * const data = await response.json();
 * console.log(data.html);
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<ScraperOptions>;

    // Validate URL
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Default to JSON format for API responses
    const options: ScraperOptions = {
      ...body,
      format: body.format || 'json'
    };

    const result = await renderWithCloudflare(options);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Scraper API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scraper?url=...
 *
 * Quick GET endpoint for simple rendering.
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/scraper?url=https://example.com&blockImages=true');
 * const data = await response.json();
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const options: ScraperOptions = {
      url,
      blockImages: request.nextUrl.searchParams.get('blockImages') === 'true',
      bypassCaptcha: request.nextUrl.searchParams.get('bypassCaptcha') !== 'false',
      timeout: parseInt(request.nextUrl.searchParams.get('timeout') || '30000'),
      format: (request.nextUrl.searchParams.get('format') as 'html' | 'json') || 'json'
    };

    const result = await renderWithCloudflare(options);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Scraper API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
