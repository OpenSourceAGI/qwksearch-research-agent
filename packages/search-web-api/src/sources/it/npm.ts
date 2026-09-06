/**
 * @fileoverview Engine adapter that queries the npm registry search API.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const npm: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    text: query,
    size: "10",
    from: String(((page || 1) - 1) * 10),
  });
  const response = await fetch(
    `https://registry.npmjs.org/-/v1/search?${params}`,
    {
      headers: {
        "User-Agent": "HonoxSearX/1.0",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: any[] = [];

  if (data && data.objects) {
    data.objects.forEach((item: any) => {
      results.push({
        url: item.package.links.npm,
        title: item.package.name,
        content: item.package.description || "",
        engine: "npm",
      });
    });
  }

  return results;
};
