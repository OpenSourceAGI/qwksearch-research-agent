/**
 * @module research/search/tavily
 * @description Research library module.
 */
import axios from "axios";
import configManager from "../config";

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
    configManager.getConfig("search.tavilyApiKey", "") ||
    (typeof process !== "undefined" ? process.env.TAVILY_API_KEY : "") ||
    "";

  if (!tavilyApiKey) {
    throw new Error(
      "Tavily API key not configured. Please add your API key in Settings > Search.",
    );
  }

  try {
    const response = await axios.post<TavilyResponse>(
      "https://api.tavily.com/search",
      {
        api_key: tavilyApiKey,
        query: query,
        search_depth: opts?.searchDepth || "basic",
        max_results: opts?.maxResults || 10,
        include_domains: opts?.includeDomains || [],
        exclude_domains: opts?.excludeDomains || [],
        include_answer: false,
        include_raw_content: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const results = response.data.results || [];

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
    throw new Error(
      `Tavily search failed: ${error.response?.data?.error || error.message}`,
    );
  }
};

export const getTavilyApiKey = () =>
  configManager.getConfig("search.tavilyApiKey", "") ||
  (typeof process !== "undefined" ? process.env.TAVILY_API_KEY : "") ||
  "";

export const isTavilyConfigured = () => {
  const apiKey = getTavilyApiKey();
  return apiKey && apiKey.length > 0;
};
