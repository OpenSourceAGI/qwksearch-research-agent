/**
 * @fileoverview OpenRouter Free Models Validator
 *
 * Validates which OpenRouter free models actually work with the configured API key.
 * Only models that pass validation should be shown to guests and new users.
 *
 * Usage:
 *   import { validateOpenRouterModels, getValidatedFreeModels } from '@/lib/utils/validate-openrouter-models';
 *
 *   // Test all free models
 *   const result = await validateOpenRouterModels();
 *
 *   // Get only working models
 *   const workingModels = result.availableModels;
 */

import { generateText } from "ai";
import { createOpenRouter } from "@ai-sdk/openrouter";
import { LANGUAGE_MODELS } from "ai-research-agent/config/language-models-database";

export interface ModelValidationResult {
  modelId: string;
  modelName: string;
  available: boolean;
  error?: string;
  latency?: number;
  testTimestamp: string;
}

export interface OpenRouterValidationResult {
  totalTested: number;
  availableModels: ModelValidationResult[];
  unavailableModels: ModelValidationResult[];
  testDuration: number;
  apiKeyPresent: boolean;
}

/**
 * Get OpenRouter free models from the database
 */
function getOpenRouterFreeModels() {
  const openRouterProvider = LANGUAGE_MODELS.find(
    (p) => p.provider.toLowerCase() === "openrouter"
  );

  if (!openRouterProvider) {
    throw new Error("OpenRouter provider not found in database");
  }

  return openRouterProvider.models.filter((m) => m.free === true);
}

/**
 * Test a single OpenRouter model
 */
async function testOpenRouterModel(
  apiKey: string,
  modelId: string,
  modelName: string,
  timeout: number = 15000
): Promise<ModelValidationResult> {
  const startTime = Date.now();

  try {
    const openrouter = createOpenRouter({
      apiKey,
    });

    const model = openrouter(modelId);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout)
    );

    // Test with a minimal prompt
    const testPromise = generateText({
      model,
      prompt: "Reply with just 'OK'",
      maxTokens: 10,
    });

    await Promise.race([testPromise, timeoutPromise]);

    const latency = Date.now() - startTime;

    return {
      modelId,
      modelName,
      available: true,
      latency,
      testTimestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      modelId,
      modelName,
      available: false,
      error: error.message || String(error),
      latency: Date.now() - startTime,
      testTimestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validate all OpenRouter free models with the configured API key
 *
 * @param concurrency - Number of concurrent tests (default: 3)
 * @param timeout - Timeout per model test in ms (default: 15000)
 * @param onProgress - Optional callback for progress updates
 */
export async function validateOpenRouterModels(
  concurrency: number = 3,
  timeout: number = 15000,
  onProgress?: (current: number, total: number, modelName: string) => void
): Promise<OpenRouterValidationResult> {
  const startTime = Date.now();

  // Get API key from environment
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not found in environment");
    return {
      totalTested: 0,
      availableModels: [],
      unavailableModels: [],
      testDuration: 0,
      apiKeyPresent: false,
    };
  }

  // Get free models from database
  const freeModels = getOpenRouterFreeModels();

  const results: ModelValidationResult[] = [];
  const queue = [...freeModels];
  let completed = 0;

  // Test models with concurrency control
  const workers = Array(Math.min(concurrency, freeModels.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const model = queue.shift();
        if (!model) break;

        const result = await testOpenRouterModel(
          apiKey,
          model.id,
          model.name,
          timeout
        );

        results.push(result);
        completed++;

        if (onProgress) {
          onProgress(completed, freeModels.length, model.name);
        }

        // Log progress
        console.log(
          `[${completed}/${freeModels.length}] ${model.name}: ${
            result.available ? "✓" : "✗"
          } ${result.error ? `(${result.error})` : `(${result.latency}ms)`}`
        );
      }
    });

  await Promise.all(workers);

  const availableModels = results.filter((r) => r.available);
  const unavailableModels = results.filter((r) => !r.available);

  const testDuration = Date.now() - startTime;

  console.log("\n=== OpenRouter Free Models Validation Summary ===");
  console.log(`Total tested: ${freeModels.length}`);
  console.log(`Available: ${availableModels.length}`);
  console.log(`Unavailable: ${unavailableModels.length}`);
  console.log(`Test duration: ${(testDuration / 1000).toFixed(2)}s\n`);

  if (availableModels.length > 0) {
    console.log("Available models:");
    availableModels.forEach((m) => {
      console.log(`  ✓ ${m.modelName} (${m.latency}ms)`);
    });
  }

  if (unavailableModels.length > 0) {
    console.log("\nUnavailable models:");
    unavailableModels.forEach((m) => {
      console.log(`  ✗ ${m.modelName}: ${m.error}`);
    });
  }

  return {
    totalTested: freeModels.length,
    availableModels,
    unavailableModels,
    testDuration,
    apiKeyPresent: true,
  };
}

/**
 * Get list of validated free model IDs that are currently working
 * Returns cached results if available and not expired (24 hours)
 */
export async function getValidatedFreeModels(
  forceRefresh: boolean = false
): Promise<string[]> {
  // In a real app, you'd want to cache results in a database or KV store
  // For now, we'll always validate (you can add caching logic later)
  const result = await validateOpenRouterModels();
  return result.availableModels.map((m) => m.modelId);
}

/**
 * Filter a list of models to only include validated working models
 */
export function filterWorkingModels<T extends { id: string }>(
  models: T[],
  validatedModelIds: string[]
): T[] {
  return models.filter((m) => validatedModelIds.includes(m.id));
}

/**
 * Check if a specific model ID is validated and working
 */
export function isModelValidated(
  modelId: string,
  validatedModelIds: string[]
): boolean {
  return validatedModelIds.includes(modelId);
}
