/**
 * @fileoverview Engine adapter that scrapes Baidu web search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const baidu: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    wd: query,
    rn: "10",
    pn: String(((page || 1) - 1) * 10),
  });
  const response = await fetch(`https://www.baidu.com/s?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Cookie: "BAIDUID=1234567890:FG=1",
    },
  });
  if (!response.ok) return [];
  const htmlString = await response.text();
  const { document } = parseHTML(htmlString);

  return Array.from(
    document.querySelectorAll(
      "#content_left > div.result, div.c-container"
    )
  )
    .map((element) => {
      const titleLink = element.querySelector("h3 a, h3.c-title a");
      const url = titleLink?.getAttribute("href") || "";
      const title = titleLink?.textContent?.trim() || "";

      if (!url || !title) {
        return null;
      }

      const content =
        element
          .querySelector(
            "div.c-abstract, div.c-span9, span.content-right_2s-H4"
          )
          ?.textContent?.trim() || "";
      const timestamp =
        element
          .querySelector("span.c-color-gray2, span.newTimeFactor_2s-H4")
          ?.textContent?.trim() || "";

      return {
        url,
        title,
        content: timestamp ? `${timestamp}\n${content}` : content,
        engine: "baidu",
      };
    })
    .filter((r) => r !== null && r.url && r.title);
};
