/**
 * @fileoverview Model availability testing and validation
 * Tests which models are actually working for a given provider
 */

import { generateText } from "ai";
import { createLLMProvider } from "write-language/provider-factory";

export interface ModelTestResult {
  modelId: string;
  modelName: string;
  available: boolean;
  error?: string;
  latency?: number;
  type?: string;
}

export interface ProviderTestResult {
  provider: string;
  totalModels: number;
  availableModels: ModelTestResult[];
  unavailableModels: ModelTestResult[];
  testDuration: number;
}

/**
 * Test a single model to see if it's working
 */
export async function testModel(
  provider: string,
  apiKey: string,
  modelId: string,
  modelName: string,
  modelType: string = "text-generation",
  timeout: number = 10000
): Promise<ModelTestResult> {
  const startTime = Date.now();

  try {
    // Only test text-generation models
    if (modelType !== "text-generation") {
      return {
        modelId,
        modelName,
        available: false,
        error: `Skipped: ${modelType} models not testable via text generation`,
        type: modelType,
      };
    }

    const model = createLLMProvider(
      provider.toLowerCase(),
      apiKey,
      modelId,
      0.1
    );

    if (!model) {
      return {
        modelId,
        modelName,
        available: false,
        error: "Provider not supported",
        type: modelType,
      };
    }

    // Create a promise that will timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Test timeout")), timeout)
    );

    // Test with a simple prompt
    const testPromise = generateText({
      model,
      prompt: "Reply with just 'OK'",
      maxTokens: 10,
    });

    const result = await Promise.race([testPromise, timeoutPromise]) as any;

    const latency = Date.now() - startTime;

    return {
      modelId,
      modelName,
      available: true,
      latency,
      type: modelType,
    };
  } catch (error: any) {
    return {
      modelId,
      modelName,
      available: false,
      error: error.message || String(error),
      latency: Date.now() - startTime,
      type: modelType,
    };
  }
}

/**
 * Test all models for a provider
 */
export async function testProviderModels(
  provider: string,
  apiKey: string,
  models: Array<{ id: string; name: string; type?: string; free?: boolean }>,
  options: {
    onlyFree?: boolean;
    concurrency?: number;
    timeout?: number;
    onProgress?: (current: number, total: number, modelName: string) => void;
  } = {}
): Promise<ProviderTestResult> {
  const {
    onlyFree = false,
    concurrency = 3,
    timeout = 10000,
    onProgress,
  } = options;

  const startTime = Date.now();

  // Filter models
  let modelsToTest = models;
  if (onlyFree) {
    modelsToTest = models.filter((m) => m.free !== false);
  }

  const results: ModelTestResult[] = [];
  const queue = [...modelsToTest];
  let completed = 0;

  // Test models with concurrency control
  const workers = Array(Math.min(concurrency, modelsToTest.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const model = queue.shift();
        if (!model) break;

        const result = await testModel(
          provider,
          apiKey,
          model.id,
          model.name,
          model.type || "text-generation",
          timeout
        );

        results.push(result);
        completed++;

        if (onProgress) {
          onProgress(completed, modelsToTest.length, model.name);
        }
      }
    });

  await Promise.all(workers);

  const availableModels = results.filter((r) => r.available);
  const unavailableModels = results.filter((r) => !r.available);

  return {
    provider,
    totalModels: modelsToTest.length,
    availableModels,
    unavailableModels,
    testDuration: Date.now() - startTime,
  };
}

/**
 * Get only free models from a model list
 */
export function getOnlyFreeModels<T extends { free?: boolean }>(
  models: T[]
): T[] {
  return models.filter((m) => m.free === true);
}

/**
 * Categorize models by type
 */
export function categorizeModelsByType<
  T extends { type?: string; id: string; name: string }
>(models: T[]): Record<string, T[]> {
  const categories: Record<string, T[]> = {
    "text-generation": [],
    vision: [],
    embedding: [],
    reranker: [],
    image: [],
    video: [],
    audio: [],
    other: [],
  };

  for (const model of models) {
    const type = model.type || "text-generation";
    if (!categories[type]) {
      categories[type] = [];
    }
    categories[type].push(model);
  }

  return categories;
}
