export type NewsArticle = {
  title: string;
  url?: string;
  source?: string;
  publishedAt?: string;
};

export type TrendingTopic = {
  topic: string;
  wikiRank?: number;
  wikiViews?: number;
  newsCount: number;
  articles: NewsArticle[];
};

export type TrendingNewsData = {
  date?: string;
  topics: TrendingTopic[];
};

export type TrendingNewsTopicData = {
  topic: string;
  newsCount: number;
  articles: NewsArticle[];
};

export type TrendingNewsOptions = {
  /** URL of a deployed instance of the bundled Cloudflare Worker (`worker/index.ts`). */
  apiEndpoint?: string;
  /** When set, fetches news for this single topic instead of the daily trending list. */
  topic?: string;
  /** Max trending topics to request from the worker (default 25). */
  limit?: number;
};
