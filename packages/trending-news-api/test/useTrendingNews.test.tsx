import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrendingNews } from '../src/hooks/useTrendingNews';
import * as trendingApi from '../src/api/trending';
import type { TrendingNewsData } from '../src/types';

const ENDPOINT = 'https://news.example.workers.dev/api/trending';
const DATA: TrendingNewsData = {
  date: '2024-01-01',
  topics: [{ topic: 'Eclipse', newsCount: 1, articles: [{ title: 'Headline' }] }],
};

describe('useTrendingNews', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('stays idle and never fetches without an apiEndpoint', async () => {
    const spy = vi.spyOn(trendingApi, 'getTrendingNews');

    const { result } = renderHook(() => useTrendingNews({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('starts loading when an apiEndpoint is configured', () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrendingNews({ apiEndpoint: ENDPOINT }));

    expect(result.current.loading).toBe(true);
  });

  it('exposes the resolved data', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(DATA);

    const { result } = renderHook(() => useTrendingNews({ apiEndpoint: ENDPOINT }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(DATA);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a rejection as an Error', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockRejectedValue(new Error('worker down'));

    const { result } = renderHook(() => useTrendingNews({ apiEndpoint: ENDPOINT }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('worker down');
  });

  it('wraps a non-Error rejection value', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockRejectedValue({ code: 500 });

    const { result } = renderHook(() => useTrendingNews({ apiEndpoint: ENDPOINT }));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('Unknown error');
  });

  it('refetches when the topic changes', async () => {
    const spy = vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(DATA);

    const { result, rerender } = renderHook((props: { topic: string }) =>
      useTrendingNews({ apiEndpoint: ENDPOINT, ...props })
    , { initialProps: { topic: 'a' } });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ topic: 'b' });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it('ignores a resolution that lands after unmount', async () => {
    let resolve!: (value: TrendingNewsData) => void;
    vi.spyOn(trendingApi, 'getTrendingNews').mockReturnValue(
      new Promise<TrendingNewsData>((r) => {
        resolve = r;
      })
    );

    const { result, unmount } = renderHook(() => useTrendingNews({ apiEndpoint: ENDPOINT }));
    unmount();
    resolve(DATA);

    expect(result.current.data).toBeNull();
  });
});
