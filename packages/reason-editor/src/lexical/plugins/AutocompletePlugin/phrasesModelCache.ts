/**
 * @fileoverview Cache for lazy-loading wiki phrases model chunks from API.
 * This ensures model data is fetched only once per prefix and reused across requests.
 */

/**
 * In-memory cache for storing loaded model chunks
 * Key: prefix (e.g., "ab", "cd")
 * Value: the model data for that prefix
 */
const phrasesCache = new Map<string, Record<string, any>>();

/**
 * Track ongoing fetch requests to prevent duplicate requests
 */
const pendingRequests = new Map<string, Promise<Record<string, any>>>();

/**
 * Configuration for the API endpoint
 */
export interface PhrasesModelConfig {
  /** Base URL for the API endpoint. Defaults to '/api/autocomplete/phrases-model' */
  apiEndpoint?: string;
}

const DEFAULT_CONFIG: Required<PhrasesModelConfig> = {
  apiEndpoint: '/api/autocomplete/phrases-model',
};

/**
 * Fetches model chunks for the given prefix keys from the API.
 * Results are cached in memory to avoid redundant network requests.
 *
 * @param keys - Array of prefix keys to fetch (e.g., ["ab", "cd"])
 * @param config - Configuration options
 * @returns Promise resolving to the combined model data
 */
export async function fetchModelChunks(
  keys: string[],
  config: PhrasesModelConfig = {}
): Promise<Record<string, Record<string, any>>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Filter out keys that are already cached
  const uncachedKeys = keys.filter(key => !phrasesCache.has(key));

  if (uncachedKeys.length === 0) {
    // All keys are cached, return immediately
    const result: Record<string, Record<string, any>> = {};
    for (const key of keys) {
      const cached = phrasesCache.get(key);
      if (cached) {
        result[key] = cached;
      }
    }
    return result;
  }

  // Check if there are pending requests for any uncached keys
  const keysToFetch: string[] = [];
  const pendingPromises: Promise<Record<string, any>>[] = [];

  for (const key of uncachedKeys) {
    const pending = pendingRequests.get(key);
    if (pending) {
      pendingPromises.push(pending);
    } else {
      keysToFetch.push(key);
    }
  }

  // Wait for any pending requests
  if (pendingPromises.length > 0) {
    await Promise.all(pendingPromises);
  }

  // Fetch remaining keys if needed
  if (keysToFetch.length > 0) {
    const keysParam = keysToFetch.join(',');
    const url = `${finalConfig.apiEndpoint}?keys=${encodeURIComponent(keysParam)}`;

    // Create a promise for this fetch and track it
    const fetchPromise = (async () => {
      try {
        console.log(`[PhrasesModelCache] Fetching model chunks for keys: ${keysParam}`);
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.warn(`[PhrasesModelCache] Phrases model API not available (${response.status}). Autocomplete will be disabled.`, {
            status: response.status,
            statusText: response.statusText,
            url,
            errorText
          });
          // Return empty data instead of throwing - this gracefully disables the feature
          return {};
        }

        const data = await response.json() as Record<string, Record<string, any>>;
        console.log(`[PhrasesModelCache] Successfully fetched ${Object.keys(data).length} chunks`);

        // Cache the results
        for (const [key, value] of Object.entries(data)) {
          phrasesCache.set(key, value);
        }

        return data;
      } catch (error) {
        console.warn('[PhrasesModelCache] Autocomplete disabled - model unavailable:', error);
        // Return empty data to gracefully disable autocomplete instead of breaking the app
        return {};
      } finally {
        // Clean up pending requests
        for (const key of keysToFetch) {
          pendingRequests.delete(key);
        }
      }
    })();

    // Track this request for all keys being fetched
    for (const key of keysToFetch) {
      pendingRequests.set(key, fetchPromise);
    }

    await fetchPromise;
  }

  // Collect all requested keys from cache
  const result: Record<string, Record<string, any>> = {};
  for (const key of keys) {
    const cached = phrasesCache.get(key);
    if (cached) {
      result[key] = cached;
    }
  }

  return result;
}

/**
 * Gets model data for a single prefix key.
 * Fetches from API if not cached.
 *
 * @param key - The prefix key (e.g., "ab")
 * @param config - Configuration options
 * @returns Promise resolving to the model data for that prefix
 */
export async function getModelChunk(
  key: string,
  config: PhrasesModelConfig = {}
): Promise<Record<string, any> | undefined> {
  const chunks = await fetchModelChunks([key], config);
  return chunks[key];
}

/**
 * Preloads multiple model chunks in advance.
 * Useful for warming up the cache before user interaction.
 *
 * @param keys - Array of prefix keys to preload
 * @param config - Configuration options
 */
export async function preloadModelChunks(
  keys: string[],
  config: PhrasesModelConfig = {}
): Promise<void> {
  await fetchModelChunks(keys, config);
}

/**
 * Checks if a specific prefix key is cached.
 *
 * @param key - The prefix key to check
 * @returns True if the key is cached, false otherwise
 */
export function isChunkCached(key: string): boolean {
  return phrasesCache.has(key);
}

/**
 * Gets the number of cached chunks.
 *
 * @returns The number of prefix keys currently in cache
 */
export function getCacheSize(): number {
  return phrasesCache.size;
}

/**
 * Clears the entire phrases model cache.
 * Useful for freeing memory or forcing a refresh.
 */
export function clearCache(): void {
  phrasesCache.clear();
  pendingRequests.clear();
  console.log('[PhrasesModelCache] Cache cleared');
}

/**
 * Clears specific chunks from the cache.
 *
 * @param keys - Array of prefix keys to remove from cache
 */
export function clearChunks(keys: string[]): void {
  for (const key of keys) {
    phrasesCache.delete(key);
  }
  console.log(`[PhrasesModelCache] Cleared ${keys.length} chunks from cache`);
}
