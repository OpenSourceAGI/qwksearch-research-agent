/**
 * @fileoverview Document share link creation. POST generates a unique share
 * token for a document, returning a shareable URL. Reuses existing tokens
 * if the document was previously shared.
 */
import { NextRequest, NextResponse } from 'next/server';
import { tursoQueries } from '@/lib/database/turso';
import { withCors, corsPreflight } from '@/lib/cors';

// POST /api/doc/share - Create a share link for a document
async function handleSharePost(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document ID is required',
        },
        { status: 400 }
      );
    }

    // Check if document exists
    const document = await tursoQueries.getDocument(documentId);
    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Check if share token already exists
    const existingToken = await tursoQueries.getShareTokenByDocumentId(documentId);
    if (existingToken) {
      return NextResponse.json({
        success: true,
        data: {
          shareId: existingToken.id,
          shareUrl: `${request.nextUrl.origin}/share/${existingToken.id}`,
        },
      });
    }

    // Create a new share token
    const shareId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString();

    await tursoQueries.createShareToken(shareId, documentId, createdAt);

    return NextResponse.json({
      success: true,
      data: {
        shareId,
        shareUrl: `${request.nextUrl.origin}/share/${shareId}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create share link',
      },
      { status: 500 }
    );
  }
}

export const POST = withCors(handleSharePost);
export const OPTIONS = corsPreflight;
