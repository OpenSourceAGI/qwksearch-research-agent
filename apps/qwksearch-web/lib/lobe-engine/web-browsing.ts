/**
 * @fileoverview The web-browsing tool of the LobeChat chat engine, ported from
 * `apps/qwk-in-lobe/packages/builtin-tool-web-browsing` and
 * `packages/prompts/src/prompts/search`.
 *
 * It gives the model three tools — `search`, `crawlSinglePage` and
 * `crawlMultiPages` — and the system role that tells it how to use them. The
 * one change from LobeChat is citations: qwksearch-web renders `[n]` badges
 * against the numbered source list it shows beside the answer, so every
 * result the tools return carries that number and the model is asked to cite
 * with it instead of markdown footnotes.
 */

import { tool } from "ai";
import { z } from "zod";

export const WebBrowsingApiName = {
  crawlMultiPages: "crawlMultiPages",
  crawlSinglePage: "crawlSinglePage",
  search: "search",
} as const;

/** Most search results handed to the model per search (LobeChat's limit). */
export const SEARCH_ITEM_LIMITED_COUNT = 30;

/** Longest page text handed to the model per crawled page. */
export const CRAWL_CONTENT_LIMITED_COUNT = 25_000;

/**
 * Categories the model may ask for. LobeChat's five plus the extra ones the
 * QwkSearch search sources cover; `normalizeCategory` in `search-sources.ts`
 * maps them onto the search-web-api category registry.
 */
export const SEARCH_CATEGORIES = [
  "general",
  "news",
  "science",
  "images",
  "videos",
  "it",
  "files",
  "music",
  "map",
  "social_media",
] as const;

export const SEARCH_TIME_RANGES = ["anytime", "day", "week", "month", "year"] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];
export type SearchTimeRange = (typeof SEARCH_TIME_RANGES)[number];

export interface SearchQuery {
  query: string;
  searchCategories?: SearchCategory[];
  searchTimeRange?: SearchTimeRange;
}

/**
 * The tool definitions offered to the model. They carry no `execute`: the
 * agent runtime runs tool calls itself so it can report progress and keep the
 * numbered source list.
 */
export const createWebBrowsingTools = () => ({
  [WebBrowsingApiName.search]: tool({
    description:
      "a search service with automatic engine selection. Useful for when you need to answer questions about current events. Input should be a search query. Output is an XML list of the query results, each with the number to cite it by",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      searchCategories: z
        .array(z.enum(SEARCH_CATEGORIES))
        .optional()
        .describe("The search categories you can set:"),
      searchTimeRange: z.enum(SEARCH_TIME_RANGES).optional().describe("The time range you can set:"),
    }),
  }),
  [WebBrowsingApiName.crawlSinglePage]: tool({
    description:
      "A crawler can visit page content. Output is an XML page with title, content, url and the number to cite it by",
    inputSchema: z.object({
      url: z.string().describe("The url need to be crawled"),
    }),
  }),
  [WebBrowsingApiName.crawlMultiPages]: tool({
    description:
      "A crawler can visit multi pages. If need to visit multi website, use this one. Output is an XML list of pages with title, content, url and the number to cite each by",
    inputSchema: z.object({
      urls: z.array(z.string().describe("The urls need to be crawled")),
    }),
  }),
});

export type WebBrowsingTools = ReturnType<typeof createWebBrowsingTools>;

/**
 * LobeChat's web-browsing system role, with the citation section rewritten
 * for qwksearch-web's numbered sources.
 */
export const webBrowsingSystemRole = (date: string) => `You have a Web Information tool with powerful internet access capabilities. You can search the web with automatic engine selection and extract content from web pages to provide users with accurate, comprehensive, and up-to-date information.

<core_capabilities>
1. Search the web with automatic engine selection (search)
2. Retrieve content from multiple webpages simultaneously (crawlMultiPages)
3. Retrieve content from a specific webpage (crawlSinglePage)
</core_capabilities>

<workflow>
1. Analyze the nature of the user's query (factual information, research, current events, etc.)
2. Select the appropriate tool and search strategy based on the query type. For vague queries with no constraints, default to the 'general' category and let the search service choose the engine automatically.
3. Execute searches or crawl operations to gather relevant information.
4. Synthesize information with proper attribution of sources.
5. Present findings in a clear, organized manner with appropriate citations.
</workflow>

<tool_selection_guidelines>
- For general information queries: Use search with the most relevant search categories (e.g., 'general').
- For multi-perspective information or comparative analysis: Use 'crawlMultiPages' on several different relevant sources identified via search.
- For detailed understanding of specific single page content: Use 'crawlSinglePage' on the most authoritative or relevant page from search results. Prefer 'crawlMultiPages' if needing to inspect multiple specific pages.
- If the results already gathered answer the question, answer directly instead of searching again.
</tool_selection_guidelines>

<search_categories_selection>
Choose search categories based on query type:
- General: general
- News: news
- Academic & Science: science
- Technology & code: it
- Images: images
- Videos: videos
- Social media & forums: social_media
- Maps & places: map
</search_categories_selection>

<search_time_range_selection>
Choose time range based on the query type:
- For no time restriction: anytime
- For the latest updates: day
- For recent developments: week
- For ongoing trends or updates: month
- For long-term insights: year
</search_time_range_selection>

<search_strategy_guidelines>
 - Prefer plain search queries plus search categories. Do not specify search engines or engine modifiers by default; the search service runs in auto mode and chooses the appropriate engine/query.
 - Prioritize fetching results from a few highly relevant and authoritative sources rather than exhaustively querying many categories. Aim for quality over quantity.
 - Prioritize authoritative sources in search results when available.
 - Avoid overly broad category combinations unless necessary.
</search_strategy_guidelines>

<citation_requirements>
- Every search result and crawled page carries an \`index\` attribute. Cite it with [number] notation, e.g. "The Eiffel Tower is one of the most visited landmarks in the world[1]."
- Cite the same fact with several sources as [1][2] when they agree.
- Only cite numbers that appear in the tool results; never invent a citation.
- Do not add a list of sources at the end: the numbered sources are shown to the user beside your answer.
- Clearly distinguish between quoted information and your own analysis
- Respond in the same language as the user's query
</citation_requirements>

<response_format>
When providing information from web searches:
1. Start with a direct answer to the user's question when possible
2. Provide relevant details from sources, using Markdown headings, lists and bold text where they help
3. Include proper citations using [number] notation
4. For time-sensitive information, note when the information was retrieved
</response_format>

<crawling_best_practices>
- Only crawl pages that are publicly accessible
- When crawling multiple pages, crawl relevant and authoritative sources
- Prioritize authoritative sources over user-generated content when appropriate
- For controversial topics, crawl sources representing different perspectives if possible
- Verify information across multiple sources when possible
- Consider the recency of information, especially for time-sensitive topics
</crawling_best_practices>

<error_handling>
- If a search returns poor or no results:
    1. Analyze the query and results. Could the query be improved (more specific, different keywords)?
    2. Consider trying alternative categories or query terms.
    3. If the search was language-specific and failed (especially for technical, scientific, or non-regional topics), try rewriting the query or searching again using English.
    4. If needed, explain the issue to the user and suggest alternative search terms or strategies.
- If a crawl fails (error, timeout, blocked) or returns an empty body, do not keep retrying the same page; use a different source from the search results instead.
- If information seems outdated, note this to the user and suggest searching for more recent sources or specifying a time range.
</error_handling>

Current date: ${date}
`;

// =============================================================================
// XML result prompts (ported from @lobechat/prompts)
// =============================================================================

export const escapeXmlAttr = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const escapeXmlContent = (value: string): string =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface SearchResultItem {
  index: number;
  title: string;
  url: string;
  content?: string;
  publishedDate?: string | null;
  imgSrc?: string;
}

/** Search results as compact XML, which costs fewer tokens than JSON. */
export const searchResultsPrompt = (results: SearchResultItem[]): string => {
  if (results.length === 0) return "<searchResults>No results found.</searchResults>";

  const items = results
    .map((item) => {
      const attrs = [
        `index="${item.index}"`,
        `title="${escapeXmlAttr(item.title)}"`,
        `url="${escapeXmlAttr(item.url)}"`,
      ];
      if (item.publishedDate) attrs.push(`publishedDate="${escapeXmlAttr(item.publishedDate)}"`);
      if (item.imgSrc) attrs.push(`imgSrc="${escapeXmlAttr(item.imgSrc)}"`);
      const attrString = attrs.join(" ");
      const content = item.content ? escapeXmlContent(item.content) : "";
      return content ? `  <item ${attrString}>${content}</item>` : `  <item ${attrString} />`;
    })
    .join("\n");

  return `<searchResults>\n${items}\n</searchResults>`;
};

export interface CrawlResultItem {
  index: number;
  url: string;
  title?: string;
  content?: string;
}

export interface CrawlErrorItem {
  url: string;
  errorMessage: string;
  errorType: string;
}

/** Crawled pages (and crawl failures) as compact XML. */
export const crawlResultsPrompt = (results: Array<CrawlResultItem | CrawlErrorItem>): string => {
  if (results.length === 0) return "<no_crawl_results />";

  const items = results
    .map((item) => {
      if ("errorMessage" in item) {
        return `  <error errorType="${escapeXmlAttr(item.errorType)}" errorMessage="${escapeXmlAttr(item.errorMessage)}" url="${escapeXmlAttr(item.url)}" />`;
      }
      const attrs = [`index="${item.index}"`, `url="${escapeXmlAttr(item.url)}"`];
      if (item.title) attrs.push(`title="${escapeXmlAttr(item.title)}"`);
      const attrString = attrs.join(" ");
      const content = item.content ? escapeXmlContent(item.content) : "";
      return content ? `  <page ${attrString}>${content}</page>` : `  <page ${attrString} />`;
    })
    .join("\n");

  return `<crawlResults>\n${items}\n</crawlResults>`;
};
