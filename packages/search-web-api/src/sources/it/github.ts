import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const github: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://api.github.com/search/repositories", {
      q: query,
      page: page || 1,
      per_page: 10,
        headers: {
          "User-Agent": "HonoxSearX/1.0",
          Accept: "application/vnd.github.v3+json",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (response.data && response.data.items) {
            response.data.items.forEach((item: any) => {
              results.push({
                url: item.html_url,
                title: item.full_name,
                content: item.description || "No description",
                engine: "github",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
