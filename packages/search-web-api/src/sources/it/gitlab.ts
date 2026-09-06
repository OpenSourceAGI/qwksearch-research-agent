/**
 * @fileoverview Engine adapter that queries the GitLab API for project search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const gitlab: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    search: query,
    page: String(page || 1),
  });
  const response = await fetch(
    `https://gitlab.com/api/v4/projects?${params}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const result: any = {
          url: item.web_url || "",
          title: item.name || "",
          content: item.description || "",
          thumbnail: item.avatar_url,
          publishedDate: new Date(
            item.last_activity_at || item.created_at
          ),
          engine: "gitlab",
        };

        // Add extra fields
        result.template = "packages";
        result.package_name = item.name;
        result.maintainer = item.namespace?.name;
        result.tags = item.tag_list || [];
        result.popularity = item.star_count;
        result.homepage = item.readme_url;
        result.source_code_url = item.http_url_to_repo;

        results.push(result);
      } catch (error) {
        // Skip malformed results
        continue;
      }
    }
  }

  return results;
};
