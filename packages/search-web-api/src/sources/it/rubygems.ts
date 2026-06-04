import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const rubygems: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://rubygems.org/api/v1/search.json", {
      query: query,
      page: page || 1,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (Array.isArray(response.data)) {
            response.data.forEach((gem: any) => {
              const name = gem.name;
              const version = gem.version;
              const info = gem.info || "No description";
              const downloads = gem.downloads || 0;
              const authors = gem.authors || "";

              results.push({
                url: `https://rubygems.org/gems/${name}`,
                title: `${name} ${version}`,
                content: `${info} | By: ${authors} | 📥 ${downloads.toLocaleString()} downloads`,
                engine: "rubygems",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
