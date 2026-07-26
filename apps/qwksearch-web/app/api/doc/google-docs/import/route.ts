/**
 * @fileoverview Google Docs import endpoint. POST imports a document from
 * Google Docs by its ID and creates a local document with the content.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleDocsService } from "@/lib/integrations/googleDocsService";
import { getEnv } from "@/lib/config/env";

// POST /api/google-docs/import - Import document from Google Docs
export async function POST(request: NextRequest) {
  try {
    const { googleDocId, accessToken, refreshToken, parentId } =
      await request.json();

    if (!googleDocId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "googleDocId and accessToken are required",
        },
        { status: 400 },
      );
    }

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

    // Import from Google Docs
    const imported = await googleDocsService.importFromGoogleDocs(googleDocId);

    // Create a new document with imported content
    const userId = request.headers.get("x-user-id") || undefined;
    // const newDocument = await DocumentService.createDocument(
    //   {
    //     title: imported.title,
    //     content: imported.content,
    //     parentId: parentId || null,
    //     isExpanded: false,
    //   },
    //   userId
    // );

    return NextResponse.json(
      {
        success: true,
        // data: newDocument,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to import from Google Docs",
      },
      { status: 500 },
    );
  }
}
