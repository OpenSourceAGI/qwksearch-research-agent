export type NewsArticle = {
  title: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  imageUrl?: string;
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
  /** How the list was chosen: `wikipedia_daily_top` or `custom_topics`. */
  source?: string;
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
  /**
   * When set, fetches headlines for exactly these topics, in this order,
   * instead of the daily Wikipedia ranking. Ignored when `topic` is set.
   */
  topics?: string[];
  /** Max trending topics to request from the worker (default 25). */
  limit?: number;
};
