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

const FETCH_INIT_KEYS = new Set([
  "method", "headers", "body", "mode", "credentials", "cache",
  "redirect", "referrer", "referrerPolicy", "integrity", "keepalive",
  "signal", "priority", "duplex",
]);

/**
 * Persistent defaults applied to every request. The original grab-url package
 * exposed a `setDefaults` option to configure request-wide defaults (e.g. a
 * default `User-Agent` header) without performing a request; call sites like
 * search-web-api's engine registry rely on that behaviour. Kept module-local
 * so it survives across calls.
 */
let grabDefaults: RequestInit & Record<string, any> = {};

/**
 * Test/reset helper: clears any defaults configured via `setDefaults`.
 * @internal
 */
export function _resetGrabDefaults(): void {
  grabDefaults = {};
}

/**
 * Enhanced fetch function that includes credentials by default.
 * Supports passing extra object properties as URL query parameters (GET)
 * or as JSON body (POST/PUT/PATCH when no body is provided).
 *
 * @param url - The API endpoint URL
 * @param options - Fetch options plus extra params to be sent as query/body
 * @returns Promise with the parsed response data (JSON returned directly)
 */
export default async function grab(
  url: string,
  options?: RequestInit & Record<string, any>
): Promise<any> {
  // `setDefaults` configures request-wide defaults (e.g. a default User-Agent
  // header) and returns without performing a network request.
  if (options?.setDefaults) {
    const { setDefaults: _ignored, ...rest } = options;
    grabDefaults = {
      ...grabDefaults,
      ...rest,
      headers: {
        ...(grabDefaults.headers as Record<string, string> | undefined),
        ...(rest.headers as Record<string, string> | undefined),
      },
    };
    return undefined;
  }

  const timeout = options?.timeout ? options.timeout * 1000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      credentials: 'include' as RequestCredentials,
      signal: controller.signal,
    };

    // Seed request-level fetch options from any persisted defaults so per-call
    // options below can still override them.
    for (const [key, value] of Object.entries(grabDefaults)) {
      if (key === "timeout" || key === "responseType" || key === "headers") continue;
      if (FETCH_INIT_KEYS.has(key)) {
        (fetchOptions as any)[key] = value;
      }
    }

    const params: Record<string, string> = {};

    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (key === "timeout" || key === "responseType") continue;
        if (FETCH_INIT_KEYS.has(key)) {
          (fetchOptions as any)[key] = value;
        } else {
          if (value !== undefined && value !== null) {
            params[key] = String(value);
          }
        }
      }
    }

    // Merge persisted default headers underneath per-call headers so a
    // configured default (e.g. User-Agent) applies unless explicitly overridden.
    if (grabDefaults.headers) {
      fetchOptions.headers = {
        ...(grabDefaults.headers as Record<string, string>),
        ...(fetchOptions.headers as Record<string, string> | undefined),
      };
    }

    // Auto-stringify plain object bodies and set JSON content-type
    if (
      fetchOptions.body &&
      typeof fetchOptions.body === "object" &&
      !(fetchOptions.body instanceof FormData) &&
      !(fetchOptions.body instanceof Blob) &&
      !(fetchOptions.body instanceof ArrayBuffer) &&
      !(fetchOptions.body instanceof URLSearchParams) &&
      !(fetchOptions.body instanceof ReadableStream)
    ) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
      fetchOptions.headers = {
        "Content-Type": "application/json",
        ...(fetchOptions.headers as Record<string, string> || {}),
      };
    }

    const method = (fetchOptions.method || "GET").toUpperCase();
    let resolvedUrl = resolveApiUrl(url);

    if (Object.keys(params).length > 0) {
      if (method === "GET" || method === "HEAD") {
        const sep = resolvedUrl.includes("?") ? "&" : "?";
        resolvedUrl += sep + new URLSearchParams(params).toString();
      } else if (!fetchOptions.body) {
        fetchOptions.body = JSON.stringify(params);
        fetchOptions.headers = {
          "Content-Type": "application/json",
          ...(fetchOptions.headers as Record<string, string> || {}),
        };
      }
    }

    const response = await fetch(resolvedUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseType = options?.responseType;
    if (responseType === 'text') {
      return await response.text();
    }
    if (responseType === 'arraybuffer') {
      return await response.arrayBuffer();
    }
    if (responseType === 'blob') {
      return await response.blob();
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
