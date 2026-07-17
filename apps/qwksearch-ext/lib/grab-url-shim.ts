/**
 * Shim for grab-url inside the Chrome extension.
 * grab() in research-agent-ui is called with relative paths like "/api/agent/providers".
 * The extension has no local server, so we rewrite those to the production API.
 */

const API_BASE = 'https://app.qwksearch.com';

async function grab(url: string, options?: RequestInit): Promise<any> {
  const resolved = url.startsWith('/') ? `${API_BASE}${url}` : url;
  const res = await fetch(resolved, options);
  if (!res.ok) return null;
  return res.json();
}

export default grab;
