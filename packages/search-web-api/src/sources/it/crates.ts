import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const crates: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://crates.io/api/v1/crates", {
      q: query,
      page: page || 1,
      per_page: 10,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (response.data && response.data.crates) {
            response.data.crates.forEach((crate: any) => {
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

          return [path, { data: results }];
        },
      }
    )
  )?.data;
