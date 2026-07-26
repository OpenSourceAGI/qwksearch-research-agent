import { getEnv } from "../config/env";

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Refresh Google OAuth access token using refresh token
 */
export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<TokenRefreshResult> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
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
      throw new Error(text || "Failed to refresh access token");
    }

    const credentials = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token");
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: Date.now() + (credentials.expires_in ?? 3600) * 1000,
    };
  } catch (error: any) {
    console.error("Token refresh error:", error);
    throw new Error(`Failed to refresh token: ${error.message}`);
  }
}

/**
 * Check if access token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) return true;

  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

  return now >= expiresAt - bufferTime;
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  currentAccessToken: string,
  refreshToken: string,
  expiresAt?: number,
): Promise<{ accessToken: string; wasRefreshed: boolean }> {
  // If token is still valid, return it
  if (!isTokenExpired(expiresAt)) {
    return {
      accessToken: currentAccessToken,
      wasRefreshed: false,
    };
  }

  // Token expired, refresh it
  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    return {
      accessToken: refreshed.accessToken,
      wasRefreshed: true,
    };
  } catch (error) {
    throw new Error(
      "Token expired and refresh failed. Please reconnect Google Drive.",
    );
  }
}
