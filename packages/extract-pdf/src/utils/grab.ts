/**
 * Minimal fetch wrapper for grabbing binary/text content, shared by every
 * parse method (ts-block-algorithm, liteparse) and the OCR-need detector.
 */
export async function grab(
  url: string,
  options: { responseType?: string; timeout?: number } = {},
) {
  const timeout = options.timeout ? options.timeout * 1000 : 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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
