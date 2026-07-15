/**
 * Forwards webview API requests to the configured QwkSearch deployment.
 *
 * The webview never sees the API key: it asks the extension host for a
 * relative path (e.g. `/api/agent/chat`), and this module attaches the
 * `Authorization: Bearer <apiKey>` header and streams the response back.
 */
export interface ProxyRequest {
  method: string;
  path: string;
  body?: unknown;
}

export interface ProxyCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (status: number) => void;
  onError: (message: string) => void;
}

export async function streamApiRequest(
  apiBaseUrl: string,
  apiKey: string | undefined,
  req: ProxyRequest,
  signal: AbortSignal,
  callbacks: ProxyCallbacks,
): Promise<void> {
  const url = new URL(req.path, apiBaseUrl).toString();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal,
    });

    if (!response.body) {
      const text = await response.text();
      if (text) callbacks.onChunk(text);
      callbacks.onDone(response.status);
      return;
    }

    if (!response.ok) {
      const text = await response.text();
      callbacks.onError(text || `Request failed with status ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      callbacks.onChunk(decoder.decode(value, { stream: true }));
    }
    callbacks.onDone(response.status);
  } catch (error: any) {
    if (error?.name === "AbortError") return;
    callbacks.onError(error?.message ?? String(error));
  }
}
