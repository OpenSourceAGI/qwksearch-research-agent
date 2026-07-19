/**
 * Utility functions for working with AI models
 */

/**
 * List of model IDs that are free to use (no per-token cost)
 * Updated regularly as providers change their pricing
 */
export const FREE_MODELS = new Set([
  // OpenRouter free models
  "meta-llama/llama-3.3-70b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "deepseek/deepseek-v3",
  "deepseek/deepseek-r1",
  "meta-llama/llama-4-scout-17b-16e-instruct",

  // NVIDIA NIM free tier models
  "moonshotai/kimi-k2.5",
  "nvidia/nemotron-nano-12b-v2-vl",
  "nvidia/llama-nemotron",
  "qwen/qwen2.5",
  "meta/llama-4",

  // Groq free tier models
  "deepseek-r1-distill-llama-70b",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.3-70b-specdec",
  "llama-3.2-3b-preview",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",

  // Cloudflare Workers AI (free tier)
  "llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-instruct-fp8-fast",
  "llama-3.1-8b-instruct-fast",
  "gemma-3-12b-it",
  "mistral-small-3.1-24b-instruct",
  "qwq-32b",
  "qwen2.5-coder-32b-instruct",
  "deepseek-r1-distill-qwen-32b",
]);

/**
 * Providers that offer free tiers with generous limits
 */
export const FREE_TIER_PROVIDERS = new Set([
  "openrouter", // Free models available
  "nvidia",     // Free NIM tier
  "groq",       // Free tier with rate limits
]);

/**
 * Check if a model is free to use (no per-token cost)
 * Note: Free models may have rate limits
 */
export function isModelFree(modelId: string): boolean {
  return FREE_MODELS.has(modelId);
}

/**
 * Check if a provider offers a free tier
 */
export function hasFreeTier(providerType: string): boolean {
  return FREE_TIER_PROVIDERS.has(providerType.toLowerCase());
}

/**
 * Get a display name for a model with cost indicator
 * Example: "Llama 3.3 70B (Free)" or "GPT-4o"
 */
export function getModelDisplayName(modelName: string, modelId: string): string {
  const isFree = isModelFree(modelId);

  // If already has "(Free)" in the name, return as-is
  if (modelName.includes("(Free)")) {
    return modelName;
  }

  return isFree ? `${modelName} (Free)` : modelName;
}

/**
 * Get provider-specific information
 */
export function getProviderInfo(providerType: string): {
  name: string;
  hasFreeTier: boolean;
  signupUrl: string;
  docsUrl: string;
} {
  const type = providerType.toLowerCase();

  const providers: Record<string, any> = {
    openrouter: {
      name: "OpenRouter",
      hasFreeTier: true,
      signupUrl: "https://openrouter.ai",
      docsUrl: "https://openrouter.ai/docs",
    },
    nvidia: {
      name: "NVIDIA",
      hasFreeTier: true,
      signupUrl: "https://build.nvidia.com",
      docsUrl: "https://docs.api.nvidia.com/nim/",
    },
    groq: {
      name: "Groq",
      hasFreeTier: true,
      signupUrl: "https://console.groq.com",
      docsUrl: "https://console.groq.com/docs",
    },
    anthropic: {
      name: "Anthropic",
      hasFreeTier: false,
      signupUrl: "https://console.anthropic.com",
      docsUrl: "https://docs.anthropic.com",
    },
    openai: {
      name: "OpenAI",
      hasFreeTier: false,
      signupUrl: "https://platform.openai.com",
      docsUrl: "https://platform.openai.com/docs",
    },
    google: {
      name: "Google Gemini",
      hasFreeTier: true,
      signupUrl: "https://aistudio.google.com",
      docsUrl: "https://ai.google.dev/docs",
    },
    gemini: {
      name: "Google Gemini",
      hasFreeTier: true,
      signupUrl: "https://aistudio.google.com",
      docsUrl: "https://ai.google.dev/docs",
    },
    deepseek: {
      name: "DeepSeek",
      hasFreeTier: false,
      signupUrl: "https://platform.deepseek.com",
      docsUrl: "https://platform.deepseek.com/docs",
    },
    cloudflare: {
      name: "Cloudflare Workers AI",
      hasFreeTier: true,
      signupUrl: "https://dash.cloudflare.com",
      docsUrl: "https://developers.cloudflare.com/workers-ai/",
    },
  };

  return providers[type] || {
    name: providerType,
    hasFreeTier: false,
    signupUrl: "",
    docsUrl: "",
  };
}

/**
 * Get recommended free providers for getting started
 */
export function getRecommendedFreeProviders(): Array<{
  type: string;
  name: string;
  reason: string;
  signupUrl: string;
}> {
  return [
    {
      type: "openrouter",
      name: "OpenRouter",
      reason: "Access to Llama 3.3 70B, Nemotron, and other free models",
      signupUrl: "https://openrouter.ai",
    },
    {
      type: "groq",
      name: "Groq",
      reason: "Ultra-fast inference on Llama models, generous free tier",
      signupUrl: "https://console.groq.com",
    },
    {
      type: "nvidia",
      name: "NVIDIA",
      reason: "Free access to Nemotron and other powerful models",
      signupUrl: "https://build.nvidia.com",
    },
  ];
}
