import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const packagist: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://packagist.org/search.json", {
      q: query,
      page: page || 1,
      per_page: 15,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (response.data && response.data.results) {
            response.data.results.forEach((pkg: any) => {
              const name = pkg.name;
              const description = pkg.description || "No description";
              const downloads = pkg.downloads || 0;
              const favers = pkg.favers || 0;

              results.push({
                url: pkg.url || `https://packagist.org/packages/${name}`,
                title: name,
                content: `${description} | 📥 ${downloads.toLocaleString()} downloads | ⭐ ${favers} favorites`,
                engine: "packagist",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
