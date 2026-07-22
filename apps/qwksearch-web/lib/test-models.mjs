#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "apps/qwksearch-web/.env");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && !key.startsWith("#")) {
    env[key.trim()] = rest.join("=").trim();
  }
});

const NVIDIA_KEY = env.NVIDIA_API_KEY;
const OR_KEY = env.OPENROUTER_API_KEY;
const NVIDIA_BASE =
  env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const OR_BASE =
  env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

if (!NVIDIA_KEY || !OR_KEY) {
  console.error("Missing API keys in .env file");
  process.exit(1);
}

// Manually list the models to test
const MODELS_TO_TEST = {
  nvidia: [
    { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Llama 3.1 Nemotron 70B Instruct" },
    { id: "nvidia/nemotron-3-super-120b-a12b", name: "Nemotron 3 Super 120B" },
    { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
    { id: "google/gemma-4-31b-it", name: "Gemma 4 31B IT" },
  ],
  openrouter: [
    { id: "openrouter/free", name: "OpenRouter Free (rotating)" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B" },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra 550B" },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano 30B A3B" },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Nemotron 3 Nano Omni 30B A3B Reasoning" },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano 12B v2 VL" },
    { id: "nvidia/nemotron-nano-9b-v2:free", name: "Nemotron Nano 9B v2" },
    { id: "nvidia/nemotron-3.5-content-safety:free", name: "Nemotron 3.5 Content Safety" },
    { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B IT" },
    { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B A4B IT" },
    { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B" },
    { id: "openai/gpt-oss-20b:free", name: "GPT-OSS 20B" },
    { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder" },
    { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen3 Next 80B A3B Instruct" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct" },
    { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B Instruct" },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 Llama 3.1 405B" },
    { id: "poolside/laguna-xs-2.1:free", name: "Laguna XS 2.1" },
    { id: "poolside/laguna-xs.2:free", name: "Laguna XS 2" },
    { id: "poolside/laguna-m.1:free", name: "Laguna M 1" },
    { id: "cohere/north-mini-code:free", name: "North Mini Code" },
    { id: "liquid/lfm-2.5-1.2b-thinking:free", name: "LFM 2.5 1.2B Thinking" },
    { id: "liquid/lfm-2.5-1.2b-instruct:free", name: "LFM 2.5 1.2B Instruct" },
  ],
};

async function testChatCompletion(
  provider,
  apiKey,
  baseUrl,
  modelId,
  timeoutMs = 15000
) {
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
    return {
      ok: false,
      status: res.status,
      error: body.slice(0, 200),
      ms,
    };
  } catch (e) {
    return {
      ok: false,
      error: e.message,
      ms: Date.now() - start,
    };
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
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

async function testProvider(provider, apiKey, baseUrl) {
  console.log(`\n✓ Testing ${provider.toUpperCase()} models...`);
  const models = MODELS_TO_TEST[provider];
  console.log(`  Testing ${models.length} models\n`);

  const results = await mapWithConcurrency(models, 3, async (m) => {
    const test = await testChatCompletion(provider, apiKey, baseUrl, m.id);
    const status = test.ok ? "✓" : "✗";
    process.stdout.write(`  ${status} ${m.id.padEnd(50)}`);
    if (test.ok) {
      console.log(`[${test.ms}ms]`);
    } else {
      console.log(`[${test.error || test.status}]`);
    }
    return { model: m.id, ...test };
  });

  return results;
}

async function main() {
  console.log("\n=== Model Testing ===\n");
  console.log(`NVIDIA_API_KEY: ${NVIDIA_KEY.slice(0, 10)}...`);
  console.log(`OPENROUTER_API_KEY: ${OR_KEY.slice(0, 10)}...\n`);

  const [nvidiaResults, orResults] = await Promise.all([
    testProvider("nvidia", NVIDIA_KEY, NVIDIA_BASE),
    testProvider("openrouter", OR_KEY, OR_BASE),
  ]);

  const printResults = (provider, results) => {
    const working = results.filter((r) => r.ok);
    const broken = results.filter((r) => !r.ok);

    console.log(`\n${"=".repeat(80)}`);
    console.log(`${provider.toUpperCase()} Summary:`);
    console.log(`Working: ${working.length}/${results.length}`);

    const workingIds = working.map((r) => r.model);
    console.log(`\nGUEST_SAFE_MODELS.${provider}:`);
    console.log(`[\n  "${workingIds.join(`",\n  "`)}"${workingIds.length > 0 ? "\n" : ""}\n]`);

    return workingIds;
  };

  const nvidiaWorking = printResults("nvidia", nvidiaResults);
  const orWorking = printResults("openrouter", orResults);

  console.log("\n" + "=".repeat(80));
  console.log("\nUpdate language-models-database.ts:");
  console.log("─".repeat(80));
  console.log(
    `
export const GUEST_SAFE_MODELS = {
  nvidia: [
    ${nvidiaWorking.map((m) => `"${m}"`).join(",\n    ")}
  ],
  openrouter: [
    ${orWorking.map((m) => `"${m}"`).join(",\n    ")}
  ],
};`
  );
}

main().catch(console.error);
