/**
 * API endpoint to debug free model availability for NVIDIA and OpenRouter
 * GET /api/admin/freekeys
 *
 * Returns:
 * - Whether API keys are configured in env
 * - Free models listed in the database for each provider
 * - Live test of a quick prompt to verify keys actually work
 */
import { NextResponse } from "next/server";
import { LANGUAGE_MODELS } from "chat-agent-toolkit/config/language-models-database";

export const runtime = "nodejs";
export const maxDuration = 60;

async function testKey(
  provider: "nvidia" | "openrouter",
  apiKey: string,
  baseUrl: string,
  modelId: string
): Promise<{ ok: boolean; status?: number; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider === "openrouter"
          ? { "HTTP-Referer": "https://qwksearch.com", "X-Title": "QwkSearch" }
          : {}),
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - start;
    if (res.ok) return { ok: true, status: res.status, ms };
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 200), ms };
  } catch (e: any) {
    return { ok: false, error: e.message, ms: Date.now() - start };
  }
}

export async function GET() {
  const nvidiaKey = process.env.NVIDIA_API_KEY ?? "";
  const nvidiaBase =
    process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  const orKey = process.env.OPENROUTER_API_KEY ?? "";
  const orBase =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  const nvidiaProvider = LANGUAGE_MODELS.find(
    (p) => p.provider.toUpperCase() === "NVIDIA"
  );
  const orProvider = LANGUAGE_MODELS.find(
    (p) => p.provider.toLowerCase() === "openrouter"
  );

  const nvidiaFreeModels =
    nvidiaProvider?.models.filter((m) => m.free && m.type === "text-generation") ?? [];
  const orFreeModels =
    orProvider?.models.filter((m) => m.free && m.type === "text-generation") ?? [];

  // Test one representative model per provider if key is present
  const nvidiaTestModel = nvidiaFreeModels[0]?.id ?? "";
  const orTestModel =
    orFreeModels.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct:free")
      ?.id ?? orFreeModels[0]?.id ?? "";

  const [nvidiaTest, orTest] = await Promise.all([
    nvidiaKey && nvidiaTestModel
      ? testKey("nvidia", nvidiaKey, nvidiaBase, nvidiaTestModel)
      : Promise.resolve(null),
    orKey && orTestModel
      ? testKey("openrouter", orKey, orBase, orTestModel)
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    nvidia: {
      keyConfigured: !!nvidiaKey,
      keyMasked: nvidiaKey ? `${nvidiaKey.slice(0, 8)}...${nvidiaKey.slice(-4)}` : null,
      baseUrl: nvidiaBase,
      freeModelCount: nvidiaFreeModels.length,
      freeModels: nvidiaFreeModels.map((m) => ({
        id: m.id,
        name: m.name,
        contextLength: m.contextLength,
      })),
      liveTest: nvidiaTest
        ? { model: nvidiaTestModel, ...nvidiaTest }
        : { skipped: true, reason: nvidiaKey ? "no free model found" : "no API key" },
    },
    openrouter: {
      keyConfigured: !!orKey,
      keyMasked: orKey ? `${orKey.slice(0, 8)}...${orKey.slice(-4)}` : null,
      baseUrl: orBase,
      freeModelCount: orFreeModels.length,
      freeModels: orFreeModels.map((m) => ({
        id: m.id,
        name: m.name,
        contextLength: m.contextLength,
      })),
      liveTest: orTest
        ? { model: orTestModel, ...orTest }
        : { skipped: true, reason: orKey ? "no free model found" : "no API key" },
    },
    guestLogic: {
      note: "When OPENROUTER_API_KEY is set, ConfigManager only loads OpenRouter (NVIDIA is suppressed). To show both, remove OPENROUTER_API_KEY or the exclusion logic in config-manager.ts line 157.",
      openrouterKeySet: !!orKey,
      nvidiaWillBeLoaded: !orKey && !!nvidiaKey,
      openrouterWillBeLoaded: !!orKey,
    },
  });
}
