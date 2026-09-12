/**
 * Client for the QwkSearch article routes served by the Worker
 * (`/api/doc/article`, `/api/doc/favorites`, `/api/agent/article-*`).
 */

export interface ArticleQA {
  answer: string;
  question: string;
}

export interface ArticleDTO {
  author?: string;
  author_cite?: string;
  cite?: string;
  /** Markdown body (present for fresh extractions and crawler output). */
  content?: string;
  date?: string;
  followUpQuestions?: string[];
  html?: string;
  qaHistory?: ArticleQA[];
  source?: string;
  title?: string;
  url: string;
  via?: 'scraper' | 'tavily' | 'crawler';
  word_count?: number;
}

export interface FetchArticleResult {
  article: ArticleDTO;
  cached: boolean;
  isVideo?: boolean;
}

export class ArticleApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'ArticleApiError';
  }
}

const request = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string; message?: string };
    throw new ArticleApiError(body.error || body.message || res.statusText, res.status, body.detail);
  }

  return (await res.json()) as T;
};

export const fetchArticle = (url: string) =>
  request<FetchArticleResult>(`/api/doc/article?url=${encodeURIComponent(url)}`);

export const storeArticleQA = (url: string, qa: ArticleQA) =>
  request<{ success: boolean }>('/api/doc/article', {
    body: JSON.stringify({ url, ...qa }),
    method: 'POST',
  });

export const storeFollowUps = (url: string, followUpQuestions: string[]) =>
  request<{ success: boolean }>('/api/doc/article', {
    body: JSON.stringify({ followUpQuestions, url }),
    method: 'POST',
  });

export const askArticle = (params: {
  article: string;
  chatHistory: Array<{ content: string; role: 'user' | 'assistant' }>;
  question: string;
}) =>
  request<{ content: string; success: boolean }>('/api/agent/article-qa', {
    body: JSON.stringify(params),
    method: 'POST',
  });

export const generateArticleFollowups = (params: {
  article: string;
  chatHistory: Array<{ content: string; role: 'user' | 'assistant' }>;
  maxQuestions?: number;
}) =>
  request<{ extract: string[]; success: boolean }>('/api/agent/article-followups', {
    body: JSON.stringify(params),
    method: 'POST',
  });

export interface FavoriteDTO {
  id: number;
  title?: string | null;
  url: string;
}

export const listFavorites = () => request<{ favorites: FavoriteDTO[] }>('/api/doc/favorites');

export const addFavorite = (article: ArticleDTO) =>
  request<{ favorite: FavoriteDTO }>('/api/doc/favorites', {
    body: JSON.stringify({
      author: article.author,
      author_cite: article.author_cite,
      cite: article.cite,
      date: article.date,
      html: article.html,
      source: article.source,
      title: article.title,
      url: article.url,
      word_count: article.word_count,
    }),
    method: 'POST',
  });

export const removeFavorite = (url: string) =>
  request<{ message: string }>(`/api/doc/favorites?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
  });

/** Plain-text fallback for cached rows that only carry HTML. */
export const htmlToPlainText = (html: string): string => {
  if (typeof DOMParser === 'undefined') return html.replaceAll(/<[^>]+>/g, ' ');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre'));
  if (blocks.length === 0) return doc.body.textContent?.trim() ?? '';

  return blocks
    .map((el) => {
      const text = el.textContent?.trim() ?? '';
      if (!text) return '';
      const heading = /^H([1-6])$/.exec(el.tagName);
      if (heading) return `${'#'.repeat(Number(heading[1]))} ${text}`;
      if (el.tagName === 'LI') return `- ${text}`;
      if (el.tagName === 'BLOCKQUOTE') return `> ${text}`;
      return text;
    })
    .filter(Boolean)
    .join('\n\n');
};
