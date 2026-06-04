import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const dockerhub: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://hub.docker.com/api/search/v3/catalog/search", {
      q: query,
      page: page || 1,
      page_size: 25,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (response.data && response.data.results) {
            response.data.results.forEach((item: any) => {
              const name = item.name || item.slug;
              const namespace = item.namespace || "";
              const fullName = namespace ? `${namespace}/${name}` : name;
              const description =
                item.description || item.short_description || "No description";
              const stars = item.star_count || 0;
              const pulls = item.pull_count || 0;
              const isOfficial = item.is_official || false;

              results.push({
                url: `https://hub.docker.com/r/${fullName}`,
                title: `${fullName}${isOfficial ? " [OFFICIAL]" : ""}`,
                content: `${description} | ⭐ ${stars} | 📥 ${pulls.toLocaleString()} pulls`,
                engine: "dockerhub",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
