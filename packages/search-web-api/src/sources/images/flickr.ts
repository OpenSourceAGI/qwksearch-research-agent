/**
 * @fileoverview Engine adapter that queries the Flickr API for photo search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const flickr: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    text: query,
    page: String(page || 1),
  });
  const response = await fetch(
    `https://www.flickr.com/search?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();

  if (!html || typeof html !== "string") {
    return [];
  }

  try {
    const modelExportMatch = html.match(/modelExport:\s*({[\s\S]*?}),\s*[\n\r]/);
    if (!modelExportMatch) {
      console.log("Flickr: modelExport not found in HTML");
      if (html.length > 0) {
        console.log("Flickr: HTML sample:", html.substring(0, 1000));
      }
      return [];
    }

    const modelExport = JSON.parse(modelExportMatch[1]);
    console.log("Flickr: Parsed modelExport successfully");

    if (!modelExport.legend || !modelExport.legend[0]) {
      return [];
    }

    const legend = modelExport.legend;

    const data = legend
      .map((index: any) => {
        if (index.length !== 8) {
          return null;
        }

        try {
          const photo =
            modelExport.main[index[0]][parseInt(index[1])][index[2]][
              index[3]
            ][index[4]][index[5]][parseInt(index[6])][index[7]];

          const title = photo.title || "";
          const description = photo.description || "";
          const author = photo.realname || photo.username || "";

          const imageSizes = [
            "o",
            "k",
            "h",
            "b",
            "c",
            "z",
            "m",
            "n",
            "t",
            "q",
            "s",
          ];
          let sizeData = null;

          for (const size of imageSizes) {
            if (photo.sizes?.data?.[size]?.data) {
              sizeData = photo.sizes.data[size].data;
              break;
            }
          }

          if (!sizeData) {
            return null;
          }

          const imgSrc = sizeData.url;
          const resolution = `${sizeData.width} x ${sizeData.height}`;

          let thumbnail = imgSrc;
          if (photo.sizes?.data?.n?.data?.url) {
            thumbnail = photo.sizes.data.n.data.url;
          } else if (photo.sizes?.data?.z?.data?.url) {
            thumbnail = photo.sizes.data.z.data.url;
          }

          const url = photo.ownerNsid
            ? `https://www.flickr.com/photos/${photo.ownerNsid}/${photo.id}`
            : imgSrc;

          const content = [
            description,
            author ? `Author: ${author}` : "",
            `Resolution: ${resolution}`,
          ]
            .filter(Boolean)
            .join("\n");

          return {
            url,
            title,
            content,
            thumbnail,
            engine: "flickr",
          };
        } catch (e) {
          return null;
        }
      })
      .filter((r: any) => r !== null);

    console.log(`Flickr: Extracted ${data.length} valid results`);
    return data;
  } catch (e) {
    console.error("Error parsing Flickr response:", e);
    return [];
  }
};
