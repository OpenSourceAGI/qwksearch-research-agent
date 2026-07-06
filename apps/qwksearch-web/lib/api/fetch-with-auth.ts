/**
 * @fileoverview Authenticated fetch wrapper for API calls.
 * Automatically includes credentials (cookies) for authentication.
 */

export interface FetchOptions extends RequestInit {
  /** Parse response as JSON (default: true) */
  json?: boolean;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Makes an authenticated API request with credentials included.
 *
 * @param url - API endpoint URL (relative or absolute)
 * @param options - Fetch options with additional helpers
 * @returns Parsed JSON response or raw Response
 *
 * @example
 * ```typescript
 * // GET request
 * const data = await fetchWithAuth('/api/agent/chats');
 *
 * // POST request
 * const result = await fetchWithAuth('/api/agent/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' }),
 * });
 *
 * // DELETE request
 * await fetchWithAuth('/api/agent/chats/123', {
 *   method: 'DELETE',
 * });
 * ```
 */
export async function fetchWithAuth<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    json = true,
    timeout = 30000,
    headers = {},
    ...fetchOptions
  } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`
      );
    }

    if (json) {
      return await response.json();
    }

    return response as any;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }

    throw new Error('Unknown error occurred');
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(url: string, options?: FetchOptions) =>
    fetchWithAuth<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: FetchOptions) =>
    fetchWithAuth<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(url: string, body?: any, options?: FetchOptions) =>
    fetchWithAuth<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(url: string, body?: any, options?: FetchOptions) =>
    fetchWithAuth<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, options?: FetchOptions) =>
    fetchWithAuth<T>(url, { ...options, method: 'DELETE' }),
};
