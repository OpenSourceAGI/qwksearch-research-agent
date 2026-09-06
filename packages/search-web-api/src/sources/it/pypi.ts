/**
 * @fileoverview Engine adapter that scrapes PyPI search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const pypi: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`https://pypi.org/search/?${params}`);
  if (!response.ok) return [];
  const html = await response.text();
  const results = [];

  // PyPI search uses a simple structure
  const packageRegex =
    /<a class="package-snippet"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span class="package-snippet__name">([^<]+)<\/span>[\s\S]*?<span class="package-snippet__version">([^<]+)<\/span>[\s\S]*?<p class="package-snippet__description">([^<]*)<\/p>/g;

  let match;
  while ((match = packageRegex.exec(html)) !== null) {
    const [, url, name, version, description] = match;

    results.push({
      url: `https://pypi.org${url}`,
      title: `${name.trim()} ${version.trim()}`,
      content: description.trim() || "No description available",
      engine: "pypi",
    });
  }

  return results;
};
