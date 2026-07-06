/**
 * @fileoverview React hook for web page rendering with Cloudflare Browser.
 * Provides a convenient interface for using the scraper from React components.
 */

import { useState, useCallback } from 'react';
import type { ScraperJsonResponse, ScraperOptions } from './cloudflare-scraper-client';

interface UseScraperOptions extends Omit<ScraperOptions, 'url'> {
  /** Whether to use the local API route (/api/scraper) or call scraper directly */
  useApiRoute?: boolean;
}

interface UseScraperResult {
  /** Current scraping state */
  state: 'idle' | 'loading' | 'success' | 'error';
  /** Rendered HTML or JSON response */
  data: ScraperJsonResponse | null;
  /** Error message if state is 'error' */
  error: string | null;
  /** Trigger a scrape operation */
  scrape: (url: string) => Promise<void>;
  /** Reset the state */
  reset: () => void;
  /** Whether the scraper is currently loading */
  isLoading: boolean;
  /** Whether the scraper succeeded */
  isSuccess: boolean;
  /** Whether the scraper failed */
  isError: boolean;
}

/**
 * React hook for rendering web pages with Cloudflare Browser.
 *
 * @param options - Default scraping options
 * @returns Scraper state and controls
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const scraper = useScraper({
 *     blockImages: true,
 *     bypassCaptcha: true
 *   });
 *
 *   const handleScrape = async () => {
 *     await scraper.scrape('https://example.com');
 *     console.log(scraper.data?.html);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleScrape} disabled={scraper.isLoading}>
 *         Scrape Page
 *       </button>
 *       {scraper.isLoading && <p>Loading...</p>}
 *       {scraper.isError && <p>Error: {scraper.error}</p>}
 *       {scraper.isSuccess && <p>Load time: {scraper.data?.loadTime}ms</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScraper(options: UseScraperOptions = {}): UseScraperResult {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [data, setData] = useState<ScraperJsonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrape = useCallback(async (url: string) => {
    setState('loading');
    setError(null);
    setData(null);

    try {
      const { useApiRoute = true, ...scraperOptions } = options;

      let result: ScraperJsonResponse;

      if (useApiRoute) {
        // Use Next.js API route
        const response = await fetch('/api/scraper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            ...scraperOptions,
            format: 'json'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        result = await response.json();
      } else {
        // Call scraper directly (server-side only)
        const { renderUrlWithMetadata } = await import('./cloudflare-scraper-client');
        result = await renderUrlWithMetadata(url, scraperOptions);
      }

      setData(result);
      setState('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setState('error');
      console.error('Scraper error:', err);
    }
  }, [options]);

  const reset = useCallback(() => {
    setState('idle');
    setData(null);
    setError(null);
  }, []);

  return {
    state,
    data,
    error,
    scrape,
    reset,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}

/**
 * Hook for batch scraping multiple URLs.
 *
 * @param options - Default scraping options
 * @returns Batch scraper state and controls
 *
 * @example
 * ```tsx
 * function BatchScraperComponent() {
 *   const scraper = useBatchScraper({ blockImages: true });
 *
 *   const handleBatchScrape = async () => {
 *     await scraper.scrapeAll([
 *       'https://example.com',
 *       'https://another-site.com'
 *     ]);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleBatchScrape}>Scrape All</button>
 *       <p>Progress: {scraper.completed}/{scraper.total}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBatchScraper(options: UseScraperOptions = {}) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<Array<{ url: string; data: ScraperJsonResponse | null; error: string | null }>>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  const scrapeAll = useCallback(async (urls: string[]) => {
    setState('loading');
    setTotal(urls.length);
    setCompleted(0);
    setResults([]);

    const newResults: typeof results = [];

    for (const url of urls) {
      try {
        const response = await fetch('/api/scraper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            ...options,
            format: 'json'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        newResults.push({ url, data, error: null });
      } catch (err) {
        newResults.push({
          url,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      setCompleted(prev => prev + 1);
      setResults([...newResults]);
    }

    setState('success');
  }, [options]);

  const reset = useCallback(() => {
    setState('idle');
    setResults([]);
    setCompleted(0);
    setTotal(0);
  }, []);

  return {
    state,
    results,
    completed,
    total,
    progress: total > 0 ? (completed / total) * 100 : 0,
    scrapeAll,
    reset,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}
