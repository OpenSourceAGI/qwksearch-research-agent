/**
 * @fileoverview Google Docs sharing endpoint. POST shares a Google Doc with
 * a specific email address or generates a public shareable link.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleDocsService } from "@/lib/integrations/googleDocsService";
import { getEnv } from "@/lib/config/env";

// POST /api/google-docs/share - Share Google Doc with specific user or get shareable link
export async function POST(request: NextRequest) {
  try {
    const {
      googleDocId,
      accessToken,
      refreshToken,
      emailAddress,
      role,
      publicLink,
    } = await request.json();

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

    if (publicLink) {
      // Get shareable link
      const link = await googleDocsService.getShareableLink(googleDocId);
      return NextResponse.json({
        success: true,
        data: { shareableLink: link },
      });
    } else if (emailAddress) {
      // Share with specific user
      await googleDocsService.shareGoogleDoc(
        googleDocId,
        emailAddress,
        role || "reader",
      );
      return NextResponse.json({
        success: true,
        data: { message: `Document shared with ${emailAddress}` },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Either emailAddress or publicLink must be specified",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to share Google Doc",
      },
      { status: 500 },
    );
  }
}
