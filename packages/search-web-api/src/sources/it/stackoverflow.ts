import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const stackoverflow: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://api.stackexchange.com/2.3/search", {
      order: "desc",
      sort: "relevance",
      q: query,
      site: "stackoverflow",
      page: page || 1,
      pagesize: 10,
        headers: {
          "User-Agent": "HonoxSearX/1.0",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (response.data && response.data.items) {
            response.data.items.forEach((item: any) => {
              results.push({
                url: item.link,
                title: item.title,
                content: item.tags ? `Tags: ${item.tags.join(", ")}` : "",
                engine: "stackoverflow",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
