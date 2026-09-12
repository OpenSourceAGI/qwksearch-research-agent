/**
 * @fileoverview Research quotes collection endpoint. GET lists all quotes for
 * a document. POST creates a new quote with source, author, URL, page number,
 * and tags.
 */
import { NextRequest, NextResponse } from 'next/server';
import { tursoQueries } from '@/lib/database/turso';
import { withCors, corsPreflight } from '@/lib/cors';

// GET /api/doc/quotes?documentId=xxx - Get all quotes for a document
async function handleQuotesGet(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId is required',
        },
        { status: 400 }
      );
    }

    const quotes = await tursoQueries.getQuotesByDocument(documentId);

    return NextResponse.json({
      success: true,
      data: quotes.map((q: any) => ({
        ...q,
        tags: q.tags ? JSON.parse(q.tags) : undefined,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quotes',
      },
      { status: 500 }
    );
  }
}

// POST /api/doc/quotes - Create a new quote
async function handleQuotesPost(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, text, source, author, url, pageNumber, tags } = body;

    if (!documentId || !text) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId and text are required',
        },
        { status: 400 }
      );
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    const now = new Date().toISOString();

    await tursoQueries.createQuote(
      id,
      documentId,
      text,
      source || null,
      author || null,
      url || null,
      pageNumber || null,
      tags ? JSON.stringify(tags) : null,
      now
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id,
          documentId,
          text,
          source,
          author,
          url,
          pageNumber,
          tags,
          createdAt: now,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create quote',
      },
      { status: 500 }
    );
  }
}

export const GET = withCors(handleQuotesGet);
export const POST = withCors(handleQuotesPost);
export const OPTIONS = corsPreflight;
