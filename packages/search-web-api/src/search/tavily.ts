/**
 * @module search-web-api/tavily
 * @description Tavily search API integration.
 */

interface TavilySearchOptions {
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
}

export const searchTavily = async (
  query: string,
  opts?: TavilySearchOptions,
): Promise<{ results: TavilySearchResult[]; suggestions: string[] }> => {
  const tavilyApiKey =
    (typeof process !== "undefined" ? process.env.TAVILY_API_KEY : "") || "";

  if (!tavilyApiKey) {
    throw new Error(
      "Tavily API key not configured. Set TAVILY_API_KEY environment variable.",
    );
  }

  let sanitizedQuery = query.trim();
  if (sanitizedQuery.length > 400) {
    console.warn(`[Tavily] Query too long (${sanitizedQuery.length} chars), truncating to 400 chars`);
    sanitizedQuery = sanitizedQuery.slice(0, 400);
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: sanitizedQuery,
        search_depth: opts?.searchDepth || "basic",
        max_results: opts?.maxResults || 10,
        include_domains: opts?.includeDomains || [],
        exclude_domains: opts?.excludeDomains || [],
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as TavilyResponse;
    const results = data.results || [];

    return {
      results: results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        raw_content: r.raw_content,
      })),
      suggestions: [],
    };
  } catch (error: any) {
    console.error("Tavily search error:", error);

    if (error.message?.includes("400")) {
      console.error("Tavily 400 error - Query length:", sanitizedQuery.length);
      console.error("Tavily 400 error - Query preview:", sanitizedQuery.slice(0, 200));
    }

    throw new Error(
      `Tavily search failed: ${error.message}`,
    );
  }
};

export const getTavilyApiKey = () =>
  (typeof process !== "undefined" ? process.env.TAVILY_API_KEY : "") || "";

export const isTavilyConfigured = () => {
  const apiKey = getTavilyApiKey();
  return apiKey && apiKey.length > 0;
};
