/**
 * @fileoverview Engine adapter that queries the Hacker News (Algolia) API for story search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const hackernews: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const pageno = page || 1;
  const resultsPerPage = 30;

  let searchType = "search";
  let queryParams: Record<string, any> = {
    page: pageno - 1,
  };

  if (!query || query.trim() === "") {
    // If search query is empty, show results from HN's front page
    searchType = "search_by_date";
    queryParams.tags = "front_page";
  } else {
    queryParams = {
      query,
      page: pageno - 1,
      hitsPerPage: resultsPerPage,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      advancedSyntax: true,
      ignorePlurals: false,
      minProximity: 7,
      numericFilters: "[]",
      tagFilters: '["story",[]]',
      typoTolerance: true,
      queryType: "prefixLast",
      restrictSearchableAttributes:
        '["title","comment_text","url","story_text","author"]',
      getRankingInfo: true,
    };
  }

  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  const response = await fetch(
    `https://hn.algolia.com/api/v1/${searchType}?${searchParams.toString()}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X1; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const jsonData = await response.json();
  const results: any[] = [];

  if (!jsonData?.hits) {
    return results;
  }

  for (const hit of jsonData.hits) {
    const objectId = hit.objectID;
    const points = hit.points || 0;
    const numComments = hit.num_comments || 0;

    // Extract content from various possible fields
    let content = hit.url || hit.comment_text || hit.story_text || "";

    // Strip HTML tags from content if present
    if (content) {
      content = content.replace(/<[^>]*>/g, "").trim();
    }

    // Build metadata string
    let metadata = "";
    if (points !== 0 || numComments !== 0) {
      metadata = `points: ${points} | comments: ${numComments}`;
    }

    // Combine content and metadata
    const fullContent = metadata ? `${metadata}\n${content}` : content;

    results.push({
      title: hit.title || `author: ${hit.author}`,
      url: `https://news.ycombinator.com/item?id=${objectId}`,
      content: fullContent,
      points,
      numComments,
      engine: "hackernews",
    });
  }

  return results;
};
