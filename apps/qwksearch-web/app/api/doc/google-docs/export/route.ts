/**
 * @fileoverview Google Docs export endpoint. POST exports a local document
 * to Google Docs using the user's OAuth access token.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleDocsService } from "@/lib/integrations/googleDocsService";
import { getEnv } from "@/lib/config/env";

// POST /api/google-docs/export - Export document to Google Docs
export async function POST(request: NextRequest) {
  try {
    const { documentId, accessToken, refreshToken } = await request.json();

    if (!documentId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "documentId and accessToken are required",
        },
        { status: 400 },
      );
    }

    // Get the document
    // const document = await DocumentService.getDocument(documentId);
    // if (!document) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'Document not found',
    //     },
    //     { status: 404 }
    //   );
    // }

    // Get Google OAuth credentials
    const clientId = getEnv("GOOGLE_CLIENT_ID")!;
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET")!;
    const redirectUri =
      getEnv("GOOGLE_REDIRECT_URI") ||
      "https://qwksearch.com/api/google-docs/callback";

    // Create Google Docs service
    const googleDocsService = new GoogleDocsService(
      { clientId, clientSecret, redirectUri },
      accessToken,
      refreshToken,
    );

    // Export to Google Docs
    const userId = request.headers.get("x-user-id") || undefined;
    const result = await googleDocsService.exportToGoogleDocs(
      document.title,
      // @ts-ignore
      document.content,
      documentId,
      userId,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to export to Google Docs",
      },
      { status: 500 },
    );
  }
}
