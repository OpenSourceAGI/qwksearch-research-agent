/**
 * @fileoverview Engine adapter that queries the crates.io API for Rust package search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const crates: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    page: String(page || 1),
    per_page: "10",
  });
  const response = await fetch(`https://crates.io/api/v1/crates?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  const results: any[] = [];

  if (data && data.crates) {
    data.crates.forEach((crate: any) => {
      const name = crate.name;
      const version = crate.max_version || crate.newest_version;
      const description = crate.description || "No description";
      const downloads = crate.downloads || 0;
      const recent_downloads = crate.recent_downloads || 0;

      results.push({
        url: `https://crates.io/crates/${name}`,
        title: `${name} ${version}`,
        content: `${description} | 📥 ${downloads.toLocaleString()} total, ${recent_downloads.toLocaleString()} recent`,
        engine: "crates",
      });
    });
  }

  return results;
};
