/**
 * @fileoverview Fetch wrapper that automatically includes credentials
 * for authenticated API requests. This ensures session cookies are sent with
 * all requests to the backend API.
 *
 * Replaces grab-url with native fetch for better compatibility.
 */

/**
 * Resolves bare relative paths against the API root. The original grab-url
 * package resolved every path against a configured `/api/` base, and call
 * sites throughout the app still pass paths like `"config"` or
 * `"doc/article"` — resolving those against the current page URL would hit
 * nonexistent routes (e.g. `/doc/article` instead of `/api/doc/article`).
 * Absolute URLs and root-relative (`/...`) paths pass through unchanged.
 */
function resolveApiUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("/")) {
    return url;
  }
  return url.startsWith("api/") ? `/${url}` : `/api/${url}`;
}

/**
 * Enhanced fetch function that includes credentials by default.
 * This ensures authentication cookies are sent with API requests.
 *
 * @param url - The API endpoint URL
 * @param options - Fetch options (credentials: 'include' is added by default)
 * @returns Promise with the response data
 */
export default async function grab(
  url: string,
  options?: RequestInit & Record<string, any>
): Promise<any> {
  const timeout = options?.timeout ? options.timeout * 1000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Merge default credentials option with provided options
    const enhancedOptions: RequestInit = {
      credentials: 'include' as RequestCredentials,
      ...options,
      signal: controller.signal,
    };

    // Remove non-standard fetch options
    delete (enhancedOptions as any).timeout;
    delete (enhancedOptions as any).responseType;

    const response = await fetch(resolveApiUrl(url), enhancedOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle different response types based on responseType option
    const responseType = options?.responseType;
    if (responseType === 'json' || (!responseType && response.headers.get('content-type')?.includes('application/json'))) {
      return { data: await response.json() };
    }
    if (responseType === 'text') {
      return await response.text();
    }
    if (responseType === 'arraybuffer') {
      return await response.arrayBuffer();
    }
    if (responseType === 'blob') {
      return await response.blob();
    }

    // Default to json for backwards compatibility
    try {
      return { data: await response.json() };
    } catch {
      return await response.text();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
