/**
 * @fileoverview Engine adapter that scrapes Google web search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const google: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    start: String(((page || 1) - 1) * 10),
    gbv: "1",
  });
  const response = await fetch(`https://www.google.com/search?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Cookie: "CONSENT=YES+; SOCS=CAESBQgYEgAgAA==",
    },
  });
  if (!response.ok) return [];
  const htmlString = await response.text();

  if (!htmlString || typeof htmlString !== "string") {
    return [];
  }

  const { document } = parseHTML(htmlString);

  // Google's classes change frequently. Let's try to be more robust.
  const snippets = document.querySelectorAll(".Gx5Zad.fP1Qef.xpd.EtOod.pkphOe");
  console.log(`Google: Found ${snippets.length} snippets with main selector`);

  const data = Array.from(snippets)
    .map((element) => {
      const link = element.querySelector("a");
      const url = link?.getAttribute("href");

      let realUrl = url;
      if (url && url.startsWith("/url?q=")) {
        realUrl = url.split("/url?q=")[1].split("&")[0];
        realUrl = decodeURIComponent(realUrl);
      }

      const title =
        element.querySelector(".BNeawe.vvjwJb.AP7Wnd")?.textContent?.trim() ||
        "";
      const content =
        element.querySelector(".BNeawe.s3v9rd.AP7Wnd")?.textContent?.trim() ||
        "";

      return {
        url: realUrl,
        title,
        content,
        engine: "google",
      };
    })
    .filter((r) => r.url && r.title);

  console.log(`Google: Extracted ${data.length} valid results`);
  if (data.length === 0 && htmlString.length > 0) {
    console.log("Google: HTML sample:", htmlString.substring(0, 1000));
  }

  return data;
};
