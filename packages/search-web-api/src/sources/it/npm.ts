import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const npm: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://registry.npmjs.org/-/v1/search", {
      text: query,
      size: 10,
      from: ((page || 1) - 1) * 10,
        headers: {
          "User-Agent": "HonoxSearX/1.0",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];

          if (response.data && response.data.objects) {
            response.data.objects.forEach((item: any) => {
              results.push({
                url: item.package.links.npm,
                title: item.package.name,
                content: item.package.description || "",
                engine: "npm",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
