import { apiRequest } from "./useApi";

/** Buffers a full response body and parses it as JSON. Use for non-streaming endpoints. */
export async function apiRequestJson<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let text = "";
  const { done } = apiRequest(method, path, body, (chunk) => {
    text += chunk;
  });
  const status = await done;
  if (status >= 400) {
    throw new Error(`Request to ${path} failed with status ${status}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
