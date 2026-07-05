/**
 * API endpoint to test model availability for a provider
 * POST /api/agent/test-models
 */
import { NextRequest, NextResponse } from "next/server";
import {
  testProviderModels,
  type ProviderTestResult,
} from "ai-research-agent/config/model-tester";
import { LANGUAGE_MODELS } from "ai-research-agent/config/language-models-database";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for testing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerType, apiKey, onlyFree = true } = body;

    if (!providerType) {
      return NextResponse.json(
        { error: "Provider type is required" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Find provider in database
    const providerData = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === providerType.toLowerCase()
    );

    if (!providerData) {
      return NextResponse.json(
        { error: `Provider ${providerType} not found` },
        { status: 404 }
      );
    }

    // Test models
    const result: ProviderTestResult = await testProviderModels(
      providerType,
      apiKey,
      providerData.models,
      {
        onlyFree,
        concurrency: 3,
        timeout: 15000,
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[test-models] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test models" },
      { status: 500 }
    );
  }
}
