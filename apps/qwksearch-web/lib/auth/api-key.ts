/**
 * @fileoverview API key authentication utilities for qwksearch-web.
 * Supports extracting API keys from X-API-Key headers, Authorization headers (Bearer/ApiKey),
 * and query parameters, validating them against the database user records or master key,
 * and checking whether API key requirement is enforced via site configuration.
 */

import { getDB } from "@/lib/database";
import { user as userTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import configManager from "@/lib/config";
import { getEnv } from "@/lib/config/env";
import { getSession } from "@/lib/auth/session";

/**
 * Extracts an API key from the incoming request.
 * Checks (in order):
 * 1. `X-API-Key` or `x-api-key` header
 * 2. `Authorization: Bearer <key>` or `Authorization: ApiKey <key>`
 * 3. `apiKey` or `api_key` URL query parameter
 */
export function extractApiKey(request: Request): string | null {
  if (!request) return null;

  // 1. Check custom headers
  const xApiKey = request.headers?.get?.("x-api-key") || request.headers?.get?.("X-API-Key");
  if (xApiKey && xApiKey.trim()) {
    return xApiKey.trim();
  }

  // 2. Check Authorization header
  const authHeader = request.headers?.get?.("authorization") || request.headers?.get?.("Authorization");
  if (authHeader) {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && bearerMatch[1]?.trim()) {
      return bearerMatch[1].trim();
    }
    const apiKeyMatch = authHeader.match(/^ApiKey\s+(.+)$/i);
    if (apiKeyMatch && apiKeyMatch[1]?.trim()) {
      return apiKeyMatch[1].trim();
    }
  }

  // 3. Check query parameters
  if (request.url) {
    try {
      const url = new URL(request.url);
      const queryKey = url.searchParams.get("apiKey") || url.searchParams.get("api_key");
      if (queryKey && queryKey.trim()) {
        return queryKey.trim();
      }
    } catch {
      // Ignore invalid URL
    }
  }

  return null;
}

/**
 * Validates an API key against database users and environment master key.
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; user?: any; reason?: string }> {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, reason: "missing_key" };
  }

  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, reason: "missing_key" };
  }

  // Master key check via environment variable
  const masterKey = getEnv("API_KEY");
  if (masterKey && trimmed === masterKey.trim()) {
    return {
      valid: true,
      user: {
        id: "master",
        name: "Master Admin Key",
        email: "admin@master.local",
      },
    };
  }

  try {
    const db = getDB();
    const [u] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        apiKey: userTable.apiKey,
      })
      .from(userTable)
      .where(eq(userTable.apiKey, trimmed))
      .limit(1);

    if (u) {
      return { valid: true, user: u };
    }

    return { valid: false, reason: "invalid_key" };
  } catch (err) {
    console.error("[api-key] Error validating API key:", err);
    return { valid: false, reason: "db_error" };
  }
}

/**
 * Determines whether API key authentication is currently required for external API requests.
 */
export function isApiKeyRequired(): boolean {
  const configVal = configManager.getConfig("api.requireApiKey");
  if (typeof configVal === "boolean") return configVal;
  if (typeof configVal === "string") return configVal === "true";
  return getEnv("REQUIRE_API_KEY") === "true";
}

/**
 * Checks if the request is authorized.
 * When API key is NOT required, passes through immediately.
 * When API key IS required, validates the API key first, then falls back to session auth.
 */
export async function checkApiAuth(request: Request): Promise<{
  authorized: boolean;
  response?: Response;
  user?: any;
}> {
  if (!isApiKeyRequired()) {
    return { authorized: true };
  }

  // Check API key
  const apiKey = extractApiKey(request);
  if (apiKey) {
    const keyResult = await validateApiKey(apiKey);
    if (keyResult.valid) {
      return { authorized: true, user: keyResult.user };
    }
  }

  // Check session fallback (e.g. user interacting via web app UI)
  try {
    const session = await getSession();
    if (session?.user) {
      return { authorized: true, user: session.user };
    }
  } catch {
    // Session check failed or unauthenticated
  }

  return {
    authorized: false,
    response: new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "API key is required to access this endpoint. Please provide a valid X-API-Key header or Bearer token.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  };
}
