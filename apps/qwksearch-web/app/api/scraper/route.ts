/**
 * @fileoverview API route for web page rendering with Cloudflare Browser.
 * Provides a Next.js API endpoint that proxies requests to the scraper service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderWithCloudflare, type ScraperOptions } from '@/lib/scraper';
import { withCors, corsPreflight } from '@/lib/cors';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function handleScraperPost(request: NextRequest) {
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

async function handleScraperGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

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
      blockImages: searchParams.get('blockImages') === 'true',
      bypassCaptcha: searchParams.get('bypassCaptcha') !== 'false',
      timeout: parseInt(searchParams.get('timeout') || '30000'),
      format: (searchParams.get('format') as 'html' | 'json') || 'json'
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

export const GET = withCors(handleScraperGet);
export const POST = withCors(handleScraperPost);
export const OPTIONS = corsPreflight;
