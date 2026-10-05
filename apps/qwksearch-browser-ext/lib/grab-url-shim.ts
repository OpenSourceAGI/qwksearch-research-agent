/**
 * Shim for grab-url inside the Chrome extension.
 * grab() in research-agent-ui is called with relative paths like "/api/agent/providers".
 * The extension has no local server, so we rewrite those to the production API.
 *
 * Rewritten calls carry the QwkSearch session cookie (`credentials: 'include'`),
 * so signing in at qwksearch.com from the side panel applies to these requests.
 */

export const API_BASE = 'https://qwksearch.com';

/** grab-url's own default base for a bare path such as `"agent/providers"`. */
const DEFAULT_BASE_PATH = '/api/';

/** Absolute URLs pass through; `/path` and bare `path` resolve onto the API host. */
export function resolveApiUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}${DEFAULT_BASE_PATH}${url}`;
}

export async function grab(url: string, options?: RequestInit): Promise<any> {
  const resolved = resolveApiUrl(url);
  const relative = resolved !== url;
  const res = await fetch(resolved, relative ? { credentials: 'include', ...options } : options);
  if (!res.ok) return null;
  return res.json();
}

export default grab;
