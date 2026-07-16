import { searchWeb, searchSearxng } from "extract-webpage/search/public-searxng";
import type { SearchDeps } from "../types";

const websitesForTopic = {
  tech: {
    query: ["technology news", "latest tech", "AI", "science and innovation"],
    links: ["techcrunch.com", "wired.com", "theverge.com"],
  },
  finance: {
    query: ["finance news", "economy", "stock market", "investing"],
    links: ["bloomberg.com", "cnbc.com", "marketwatch.com"],
  },
  art: {
    query: ["art news", "culture", "modern art", "cultural events"],
    links: ["artnews.com", "hyperallergic.com", "theartnewspaper.com"],
  },
  sports: {
    query: ["sports news", "latest sports", "cricket football tennis"],
    links: ["espn.com", "bbc.com/sport", "skysports.com"],
  },
  entertainment: {
    query: ["entertainment news", "movies", "TV shows", "celebrities"],
    links: ["hollywoodreporter.com", "variety.com", "deadline.com"],
  },
};

type Topic = keyof typeof websitesForTopic;

export function createSearchHandler(deps: SearchDeps = {}) {
  const searxngDomain = deps.searxngDomain ?? "https://search.qwksearch.com";

  const GET = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const query = searchParams.get("q");
    const cat = searchParams.get("cat") || "general";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const lang = searchParams.get("lang") || "en-US";
    const safesearch = searchParams.get("safesearch") === "true";
    const recency = searchParams.get("recency") || undefined;
    const publicInstances = searchParams.get("publicInstances") === "true";

    if (!query) {
      return Response.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      let results = await searchWeb(query, {
        category: cat,
        recency,
        safesearch,
        maxRetries: 6,
        privateSearxng: publicInstances ? false : searxngDomain,
        proxy: "",
        lang,
        page,
      });

      const hasResults = !results
        ? false
        : Array.isArray(results)
          ? results.length > 0
          : results.results && results.results.length > 0;

      if (!hasResults) {
        results = await searchWeb(query, {
          category: cat,
          recency,
          safesearch,
          maxRetries: 6,
          privateSearxng: false,
          proxy: "",
          lang,
          page,
        });
      }

      const elapsedTime = Date.now() - startTime;

      if (!results) {
        return Response.json({ results: [], suggestions: [], elapsedTime });
      }

      if (Array.isArray(results)) {
        return Response.json({ results, elapsedTime });
      } else {
        return Response.json({ ...results, elapsedTime });
      }
    } catch (error) {
      console.error("Search error:", error);
      return Response.json({ error: "Search failed", results: [] }, { status: 500 });
    }
  };

  return { GET };
}

export function createDiscoverHandler() {
  const GET = async (req: Request): Promise<Response> => {
    try {
      const params = new URL(req.url).searchParams;
      const mode: "normal" | "preview" =
        (params.get("mode") as "normal" | "preview") || "normal";
      const topic: Topic = (params.get("topic") as Topic) || "tech";
      const selectedTopic = websitesForTopic[topic];

      let data: any[] = [];

      if (mode === "normal") {
        const seenUrls = new Set<string>();
        data = (
          await Promise.all(
            selectedTopic.links.flatMap((link) =>
              selectedTopic.query.map(async (query) => {
                return (
                  await searchSearxng(`site:${link} ${query}`, {
                    engines: ["bing news"],
                    pageno: 1,
                    language: "en",
                  })
                ).results;
              }),
            ),
          )
        )
          .flat()
          .filter((item) => {
            const url = item.url?.toLowerCase().trim();
            if (seenUrls.has(url)) return false;
            seenUrls.add(url);
            return true;
          })
          .sort(() => Math.random() - 0.5);
      } else {
        data = (
          await searchSearxng(
            `site:${
              selectedTopic.links[
                Math.floor(Math.random() * selectedTopic.links.length)
              ]
            } ${
              selectedTopic.query[
                Math.floor(Math.random() * selectedTopic.query.length)
              ]
            }`,
            { engines: ["bing news"], pageno: 1, language: "en" },
          )
        ).results;
      }

      return Response.json({ blogs: data }, { status: 200 });
    } catch (err) {
      console.error(`An error occurred in discover route: ${err}`);
      return Response.json({ message: "An error has occurred" }, { status: 500 });
    }
  };

  return { GET };
}
