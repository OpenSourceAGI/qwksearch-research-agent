/**
 * Fetch wrapper for grabbing binary content
 * Replacement for grab-url package using standard fetch API
 */
export default async function grab(
  url: string,
  options: { responseType?: string; timeout?: number } = {}
) {
  const timeoutMs = options.timeout ? options.timeout * 1000 : 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
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
