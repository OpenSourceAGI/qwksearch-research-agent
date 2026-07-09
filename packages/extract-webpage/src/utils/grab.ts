/**
 * Fetch wrapper for grabbing binary content
 * Replacement for grab-url package using standard fetch API
 */
export interface GrabOptions {
  responseType?: "text" | "arraybuffer";
  /** Timeout in seconds */
  timeout?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export default async function grab(
  url: string,
  options?: GrabOptions & { responseType?: "text" }
): Promise<string>;
export default async function grab(
  url: string,
  options: GrabOptions & { responseType: "arraybuffer" }
): Promise<ArrayBuffer>;
export default async function grab(
  url: string,
  options: GrabOptions = {}
): Promise<string | ArrayBuffer> {
  const timeoutMs = options.timeout ? options.timeout * 1000 : 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (options.responseType === "arraybuffer") {
      return await response.arrayBuffer();
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
