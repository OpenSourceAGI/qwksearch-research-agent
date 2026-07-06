/**
 * @fileoverview API endpoint to validate OpenRouter free models
 *
 * GET /api/agent/validate-openrouter
 *   Returns cached validation results or runs a new validation
 *
 * POST /api/agent/validate-openrouter
 *   Forces a fresh validation of all free models
 *
 * This endpoint is used to ensure only working free models are shown to guests
 */

import { NextRequest, NextResponse } from "next/server";
import { validateOpenRouterModels } from "@/lib/utils/validate-openrouter-models";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for full validation

// In-memory cache for validation results
// In production, this should be stored in KV or database
let cachedValidation: {
  result: any;
  timestamp: number;
} | null = null;

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET - Return cached validation or run new one if cache is stale
 */
export async function GET(req: NextRequest) {
  try {
    const now = Date.now();

    // Return cached results if fresh
    if (
      cachedValidation &&
      now - cachedValidation.timestamp < CACHE_TTL
    ) {
      return NextResponse.json({
        ...cachedValidation.result,
        cached: true,
        cacheAge: now - cachedValidation.timestamp,
      });
    }

    // Run validation
    const result = await validateOpenRouterModels();

    // Cache the results
    cachedValidation = {
      result,
      timestamp: now,
    };

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error: any) {
    console.error("[validate-openrouter] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Validation failed" },
      { status: 500 }
    );
  }
}

/**
 * POST - Force fresh validation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { concurrency = 3, timeout = 15000 } = body;

    // Run validation
    const result = await validateOpenRouterModels(concurrency, timeout);

    // Update cache
    cachedValidation = {
      result,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error: any) {
    console.error("[validate-openrouter] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Validation failed" },
      { status: 500 }
    );
  }
}
