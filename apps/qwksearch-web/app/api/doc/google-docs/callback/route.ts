/**
 * @fileoverview Google OAuth callback handler. GET exchanges the authorization
 * code for tokens, stores them in secure HTTP-only cookies, and renders an
 * HTML page that notifies the opener window of success/failure.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleDocsService } from "@/lib/integrations/googleDocsService";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/config/env";

// GET /api/google-docs/callback - OAuth callback handler
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>Authorization Failed</title></head>
          <body>
            <h1>Authorization Failed</h1>
            <p>Authorization code not provided</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'google-drive-error', error: 'No authorization code' }, '*');
              }
            </script>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        },
      );
    }

    const clientId = getEnv("GOOGLE_CLIENT_ID")!;
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET")!;
    const redirectUri =
      getEnv("GOOGLE_REDIRECT_URI") ||
      "https://qwksearch.com/api/google-docs/callback";

    const tokens = await GoogleDocsService.getTokensFromCode(
      { clientId, clientSecret, redirectUri },
      code,
    );

    // Store tokens in secure HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("google_access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    if (tokens.refreshToken) {
      cookieStore.set("google_refresh_token", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Return HTML that closes the popup and notifies parent window
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Successful</title></head>
        <body>
          <h1>Authorization Successful!</h1>
          <p>You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'google-drive-connected' }, '*');
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  } catch (error: any) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>${error.message || "Failed to exchange authorization code"}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'google-drive-error', error: '${error.message}' }, '*');
            }
          </script>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}
