/**
 * Search Engine Interface — Re-exports the core engine types from the canonical
 * types module and provides the `extractResponseData` utility for normalising
 * raw grab-url responses into plain data values. All engine source files
 * import `EngineFunction` and `EngineResult` from here.
 */

import type { EngineResult, Engine, EngineFunction } from "./search-result-types";

export type { EngineResult, Engine, EngineFunction };

/**
 * Extract the actual data from a grab-url response.
 * grab-url returns `{ data: actualContent, error?: string }` or just the data directly.
 */
export function extractResponseData(response: any): any {
  if (!response) return "";

  if (typeof response === "string") return response;

  // Error envelope — return empty string to allow graceful handling
  if (typeof response === "object" && "error" in response) return "";

  if ("data" in response) return response.data;

  return response;
}
