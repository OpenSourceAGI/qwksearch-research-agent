/**
 * @fileoverview Google Drive file content fetcher. GET downloads a file's
 * content by ID, handling both Google Workspace exports and regular file
 * downloads. Automatically refreshes expired tokens.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/config/env";

const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getEnv("GOOGLE_CLIENT_ID")!,
      client_secret: getEnv("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || "invalid_grant");
    err.code = 401;
    throw err;
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function driveRequest(
  url: string,
  tokenRef: { token: string; refresh?: string; refreshed: boolean },
): Promise<Response> {
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenRef.token}` },
  });
  if (res.status === 401 && tokenRef.refresh) {
    tokenRef.token = await refreshAccessToken(tokenRef.refresh);
    tokenRef.refreshed = true;
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenRef.token}` },
    });
  }
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || `Request failed: ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return res;
}

function pickExportMime(mimeType: string): string {
  if (mimeType.includes("spreadsheet")) return "text/csv";
  return "text/plain";
}

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "fileId parameter is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;
    const refreshToken = cookieStore.get("google_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated with Google Drive" },
        { status: 401 },
      );
    }

    const tokenRef = { token: accessToken, refresh: refreshToken, refreshed: false };

    const metaUrl = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent("id,name,mimeType,size,modifiedTime,webViewLink")}`;
    const metaRes = await driveRequest(metaUrl, tokenRef);
    const file = (await metaRes.json()) as {
      id?: string;
      name?: string;
      mimeType?: string;
      size?: string;
      modifiedTime?: string;
      webViewLink?: string;
    };

    let contentBuf: ArrayBuffer;
    if (file.mimeType?.startsWith("application/vnd.google-apps")) {
      const exportUrl = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(pickExportMime(file.mimeType))}`;
      const res = await driveRequest(exportUrl, tokenRef);
      contentBuf = await res.arrayBuffer();
    } else {
      const dlUrl = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media`;
      const res = await driveRequest(dlUrl, tokenRef);
      contentBuf = await res.arrayBuffer();
    }

    if (tokenRef.refreshed) {
      cookieStore.set("google_access_token", tokenRef.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        content: Buffer.from(contentBuf).toString("base64"),
      },
    });
  } catch (error: any) {
    console.error("Error fetching Google Drive file:", error);

    if (error.code === 401 || error.message?.includes("invalid_grant")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication expired. Please reconnect Google Drive.",
          needsReauth: true,
        },
        { status: 401 },
      );
    }

    if (error.code === 404 || error.message?.includes("File not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found or access denied. You may need to reconnect Google Drive.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch file from Google Drive" },
      { status: 500 },
    );
  }
}
