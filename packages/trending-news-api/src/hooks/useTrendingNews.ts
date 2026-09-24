import { useEffect, useState } from 'react';
import type { TrendingNewsData, TrendingNewsOptions } from '../types';
import { getTrendingNews } from '../api/trending';

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
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err : new Error('Unknown error')); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
    // `topics` is an array, so it is compared by value — a caller that rebuilds
    // the same list on every render must not retrigger the fetch.
  }, [options.apiEndpoint, options.topic, options.limit, (options.topics ?? []).join('\u0000')]);

  return { data, error, loading };
}
