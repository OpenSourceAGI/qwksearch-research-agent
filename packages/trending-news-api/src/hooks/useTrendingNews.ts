import { useEffect, useState } from 'react';
import type { TrendingNewsData, TrendingNewsOptions } from '../types';
import { getTrendingNews } from '../api/trending';

/** Lead images warmed in the browser cache as soon as the list arrives. */
const PREFETCH_IMAGES = 24;

/**
 * Starts downloading each topic's lead image before its card renders, so the
 * thumbnails are already in the browser cache when the list (or the expanded
 * view) paints, instead of popping in one by one.
 */
export function prefetchTrendingImages(data: TrendingNewsData | null, max = PREFETCH_IMAGES): void {
  if (!data || typeof Image === 'undefined') return;
  const seen = new Set<string>();
  for (const topic of data.topics) {
    const src = topic.articles.find((a) => a.imageUrl)?.imageUrl;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    if (seen.size >= max) break;
  }
}

export function useTrendingNews(options: TrendingNewsOptions = {}) {
  const [data, setData] = useState<TrendingNewsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(Boolean(options.apiEndpoint));

  useEffect(() => {
    if (!options.apiEndpoint) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getTrendingNews(options)
      .then((result) => {
        if (!active) return;
        prefetchTrendingImages(result);
        setData(result);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err : new Error('Unknown error')); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
    // `topics` is an array, so it is compared by value — a caller that rebuilds
    // the same list on every render must not retrigger the fetch.
  }, [
    options.apiEndpoint,
    options.topic,
    options.limit,
    options.source,
    (options.topics ?? []).join('\u0000'),
  ]);

  return { data, error, loading };
}
