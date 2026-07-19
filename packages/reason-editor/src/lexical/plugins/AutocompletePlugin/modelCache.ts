/**
 * @fileoverview Model cache for storing and reusing the text generation pipeline.
 * This ensures the model is loaded only once and reused across predictions.
 */

// import {
//   pipeline,
//   type TextGenerationPipeline,
// } from "@huggingface/transformers";

/**
 * Cache for storing the loaded model pipeline
 */
let cachedPipeline: any | null = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * Configuration for the model
 */
export interface ModelConfig {
  model?: string;
  device?: "webgpu" | "wasm";
  dtype?: "fp32" | "fp16" | "q8" | "int8";
}

/**
 * Default model configuration
 * Using WASM with fp16 for better compatibility and accuracy
 */
const DEFAULT_CONFIG: Required<ModelConfig> = {
  model: "Xenova/distilgpt2",
  device: "wasm",
  dtype: "fp16",
};

/**
 * Preloads the text generation model and caches it in memory.
 * This function ensures the model is loaded only once and subsequent calls
 * return the cached instance.
 *
 * @param {ModelConfig} config - Configuration options for the model
 * @returns {Promise<TextGenerationPipeline>} The loaded pipeline instance
 */
export async function preloadModel(
  config: ModelConfig = {},
): Promise<any> {
  // If model is already cached, return it immediately
  if (cachedPipeline) {
    console.log("♻️ Using cached model (already loaded)");
    return cachedPipeline;
  }

  // If model is currently loading, wait for that promise
  if (isLoading && loadPromise) {
    console.log("⏳ Model is currently downloading, waiting...");
    return loadPromise;
  }

  // Start loading the model
  isLoading = true;
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log(`📥 Starting download of AI model: ${finalConfig.model}`);
  console.log(
    `⚙️ Device: ${finalConfig.device}, Data type: ${finalConfig.dtype}`,
  );

  loadPromise = (async () => {
    try {
      const startTime = performance.now();

      // @ts-ignore - Create the pipeline (this triggers the model download)
      // cachedPipeline = await pipeline("text-generation", finalConfig.model, {
      //   dtype: finalConfig.dtype,
      //   device: finalConfig.device,
      // });
      throw new Error("@huggingface/transformers is commented out");

      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(
        `✅ Model downloaded and cached successfully in ${loadTime}s`,
      );
      console.log(`🧠 Model ready for predictions`);

      return cachedPipeline!;
    } catch (error) {
      console.error("❌ Failed to download/load model:", error);
      // Reset state on error so next call can retry
      cachedPipeline = null;
      isLoading = false;
      loadPromise = null;
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Gets the cached model pipeline if it exists, or loads it if not.
 *
 * @param {ModelConfig} config - Configuration options for the model
 * @returns {Promise<TextGenerationPipeline>} The model pipeline instance
 */
export async function getModel(
  config: ModelConfig = {},
): Promise<any> {
  return preloadModel(config);
}

/**
 * Checks if the model is currently cached in memory.
 *
 * @returns {boolean} True if the model is cached, false otherwise
 */
export function isModelCached(): boolean {
  return cachedPipeline !== null;
}

/**
 * Checks if the model is currently being loaded.
 *
 * @returns {boolean} True if the model is loading, false otherwise
 */
export function isModelLoading(): boolean {
  return isLoading;
}

/**
 * Clears the cached model from memory.
 * This can be useful for freeing up memory when autocomplete is disabled.
 */
export function clearModelCache(): void {
  cachedPipeline = null;
  loadPromise = null;
  isLoading = false;
  console.log("[ModelCache] Model cache cleared");
}
