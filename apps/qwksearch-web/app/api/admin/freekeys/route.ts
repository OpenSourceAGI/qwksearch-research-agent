/**
 * API endpoint to debug free model availability for NVIDIA and OpenRouter
 *
 * GET /api/admin/freekeys
 *   - Whether API keys are visible via each env source (cloudflare:workers
 *     bindings vs process.env) — the app reads keys through both, so a key
 *     "set in the CF dashboard" that only shows in one source explains
 *     providers not loading.
 *   - The actual provider list guests receive (same code path as
 *     /api/agent/providers).
 *   - Free models listed in the database for each provider.
 *   - A quick live chat-completion test of one model per provider.
 *   - Auth diagnostics: BETTER_AUTH_SECRET, Google OAuth config, and the
 *     current request's session (to debug "unauthorized after login").
 *
 * GET /api/admin/freekeys?testAll=nvidia|openrouter|all
 *   - Live-tests every free model for the provider(s) and cross-checks each
 *     model ID against the provider's live /models endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { LANGUAGE_MODELS } from "chat-agent-toolkit/config/language-models-database";
import { getEnv } from "chat-agent-toolkit/config/environment-variables";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Reads a key from the cloudflare:workers env binding only (no fallback). */
function getCfEnv(key: string): string | undefined {
  try {
    // @ts-ignore - cloudflare:workers is a virtual module provided by @cloudflare/vite-plugin
    const cfWorkers = require("cloudflare:workers");
    return cfWorkers.env?.[key];
  } catch {
    return undefined;
  }
}

function mask(key: string): string {
  if (!key) return "";
  return key.length <= 12 ? `${key.slice(0, 4)}...` : `${key.slice(0, 8)}...${key.slice(-4)}`;
}

/**
 * Reports where an env var is visible. `effective` is what the app's shared
 * getEnv() accessor resolves (cloudflare:workers first, then process.env).
 */
function envSourceReport(key: string) {
  const cf = getCfEnv(key) ?? "";
  const proc = process.env[key] ?? "";
  const effective = getEnv(key) ?? "";
  return {
    set: !!effective,
    masked: effective ? mask(effective) : null,
    sources: {
      cloudflareEnv: !!cf,
      processEnv: !!proc,
    },
  };
}

interface LiveTestResult {
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
  ms: number;
  existsUpstream?: boolean;
}

async function testChatCompletion(
  provider: "nvidia" | "openrouter",
  apiKey: string,
  baseUrl: string,
  modelId: string,
  timeoutMs = 15000
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
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - start;
    if (res.ok) return { ok: true, status: res.status, ms };
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 200), ms };
  } catch (e: any) {
    return { ok: false, error: e.message, ms: Date.now() - start };
  }
}

/** Fetches the provider's live model ID list from its /models endpoint. */
async function fetchUpstreamModelIds(
  apiKey: string,
  baseUrl: string
): Promise<Set<string> | null> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const ids = (json?.data ?? []).map((m: any) => m.id).filter(Boolean);
    return ids.length ? new Set<string>(ids) : null;
  } catch {
    return null;
  }
}

/** Runs an async mapper over items with a small concurrency cap. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function getFreeModels(providerName: "nvidia" | "openrouter") {
  const entry = LANGUAGE_MODELS.find(
    (p) => p.provider.toLowerCase() === providerName
  );
  return (
    entry?.models.filter((m: any) => m.free && m.type === "text-generation") ?? []
  );
}

async function testAllFreeModels(
  provider: "nvidia" | "openrouter",
  apiKey: string,
  baseUrl: string
): Promise<{ upstreamModelsFetched: boolean; results: LiveTestResult[] }> {
  const freeModels = getFreeModels(provider);
  const upstream = apiKey ? await fetchUpstreamModelIds(apiKey, baseUrl) : null;

  const results = await mapWithConcurrency(freeModels, 3, async (m) => {
    const existsUpstream = upstream ? upstream.has(m.id) : undefined;
    // Skip the live call for models the provider no longer lists — it would
    // only produce a 404 and waste rate limit.
    if (existsUpstream === false) {
      return {
        model: m.id,
        ok: false,
        error: "model not listed by provider /models endpoint",
        ms: 0,
        existsUpstream,
      } as LiveTestResult;
    }
    const test = await testChatCompletion(provider, apiKey, baseUrl, m.id);
    return { model: m.id, ...test, existsUpstream } as LiveTestResult;
  });

  return { upstreamModelsFetched: !!upstream, results };
}

export async function GET(req: NextRequest) {
  const nvidiaKey = getEnv("NVIDIA_API_KEY") ?? "";
  const nvidiaBase =
    getEnv("NVIDIA_BASE_URL") ?? "https://integrate.api.nvidia.com/v1";
  const orKey = getEnv("OPENROUTER_API_KEY") ?? "";
  const orBase = getEnv("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1";

  // --- Full test mode: live-test every free model ---------------------------
  const testAll = req.nextUrl.searchParams.get("testAll");
  if (testAll) {
    const out: Record<string, any> = {};
    if (testAll === "nvidia" || testAll === "all") {
      out.nvidia = nvidiaKey
        ? await testAllFreeModels("nvidia", nvidiaKey, nvidiaBase)
        : { error: "NVIDIA_API_KEY not set" };
    }
    if (testAll === "openrouter" || testAll === "all") {
      out.openrouter = orKey
        ? await testAllFreeModels("openrouter", orKey, orBase)
        : { error: "OPENROUTER_API_KEY not set" };
    }
    return NextResponse.json(out);
  }

  // --- Summary mode ----------------------------------------------------------
  const nvidiaFreeModels = getFreeModels("nvidia");
  const orFreeModels = getFreeModels("openrouter");

  // Test one representative model per provider if key is present
  const nvidiaTestModel = nvidiaFreeModels[0]?.id ?? "";
  const orTestModel =
    orFreeModels.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct:free")
      ?.id ?? orFreeModels[0]?.id ?? "";

  const [nvidiaTest, orTest] = await Promise.all([
    nvidiaKey && nvidiaTestModel
      ? testChatCompletion("nvidia", nvidiaKey, nvidiaBase, nvidiaTestModel)
      : Promise.resolve(null),
    orKey && orTestModel
      ? testChatCompletion("openrouter", orKey, orBase, orTestModel)
      : Promise.resolve(null),
  ]);

  // Ground truth: the exact provider list /api/agent/providers gives guests.
  let guestProviders: { name: string; type: string; modelCount: number }[] = [];
  let guestProvidersError: string | null = null;
  try {
    const registry = new ModelRegistry();
    const active = await registry.getActiveProviders();
    guestProviders = active.map((p) => ({
      name: p.name,
      type: p.type,
      modelCount: p.chatModels.length,
    }));
  } catch (e: any) {
    guestProvidersError = e.message;
  }

  // Session state of THIS request — debugs "logged in but still unauthorized".
  let session: { signedIn: boolean; email?: string; userId?: string; error?: string } = {
    signedIn: false,
  };
  try {
    const s = await getSession();
    if (s) {
      session = { signedIn: true, email: s.user.email, userId: s.user.id };
    }
  } catch (e: any) {
    session = { signedIn: false, error: e.message };
  }

  return NextResponse.json({
    nvidia: {
      key: envSourceReport("NVIDIA_API_KEY"),
      keyConfigured: !!nvidiaKey,
      keyMasked: nvidiaKey ? mask(nvidiaKey) : null,
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
      key: envSourceReport("OPENROUTER_API_KEY"),
      keyConfigured: !!orKey,
      keyMasked: orKey ? mask(orKey) : null,
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
    guestProviders: {
      note: "Exactly what /api/agent/providers returns to guests. If a provider is missing here, its required env vars are not visible to the worker.",
      providers: guestProviders,
      error: guestProvidersError,
    },
    guestLogic: {
      note: "All configured providers are loaded for guests. Both NVIDIA and OpenRouter load independently when their API keys are set.",
      openrouterKeySet: !!orKey,
      nvidiaWillBeLoaded: !!nvidiaKey,
      openrouterWillBeLoaded: !!orKey,
    },
    auth: {
      betterAuthSecretSet: !!getEnv("BETTER_AUTH_SECRET"),
      googleOAuthConfigured:
        !!getEnv("GOOGLE_CLIENT_ID") && !!getEnv("GOOGLE_CLIENT_SECRET"),
      baseUrlEnv: getEnv("NEXT_PUBLIC_BASE_URL") ?? null,
      session,
      note: !getEnv("BETTER_AUTH_SECRET")
        ? "BETTER_AUTH_SECRET is not set. CF Workers restarts generate a new random signing key each time, invalidating all sessions. Add BETTER_AUTH_SECRET to your CF Workers environment variables."
        : "BETTER_AUTH_SECRET is set. Sessions will survive worker restarts.",
    },
  });
}
