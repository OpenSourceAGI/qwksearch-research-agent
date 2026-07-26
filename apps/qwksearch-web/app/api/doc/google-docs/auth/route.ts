/**
 * @fileoverview Google OAuth authorization URL generator. GET builds and
 * returns the Google OAuth consent URL for connecting Google Drive.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleDocsService } from "@/lib/integrations/googleDocsService";
import { getEnv } from "@/lib/config/env";

// GET /api/google-docs/auth - Get OAuth URL for authorization
export async function GET(request: NextRequest) {
  try {
    const clientId = getEnv("GOOGLE_CLIENT_ID");
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri =
      getEnv("GOOGLE_REDIRECT_URI") ||
      "https://qwksearch.com/api/google-docs/callback";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        },
        { status: 500 },
      );
    }

    const authUrl = GoogleDocsService.getAuthUrl({
      clientId,
      clientSecret,
      redirectUri,
    });

    return NextResponse.json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate auth URL",
      },
      { status: 500 },
    );
  }
}
