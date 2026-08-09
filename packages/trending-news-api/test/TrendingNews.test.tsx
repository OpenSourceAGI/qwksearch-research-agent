import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrendingNews } from '../src/components/TrendingNews';
import * as trendingApi from '../src/api/trending';
import type { TrendingNewsData } from '../src/types';

const ENDPOINT = 'https://news.example.workers.dev/api/trending';

function data(overrides: Partial<TrendingNewsData> = {}): TrendingNewsData {
  return {
    date: '2024-01-01',
    topics: [
      {
        topic: 'Eclipse',
        newsCount: 2,
        articles: [
          { title: 'Total eclipse crosses North America', url: 'https://example.com/a', source: 'example.com' },
          { title: 'Where to watch' },
        ],
      },
      { topic: 'Elections', newsCount: 1, articles: [] },
    ],
    ...overrides,
  };
}

describe('<TrendingNews />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing without an apiEndpoint', () => {
    const { container } = render(<TrendingNews />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while the first load is in flight', () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockReturnValue(new Promise(() => {}));

    const { container } = render(<TrendingNews apiEndpoint={ENDPOINT} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the request errors', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockRejectedValue(new Error('worker down'));

    const { container } = render(<TrendingNews apiEndpoint={ENDPOINT} />);

    // The widget stays invisible rather than disrupting the host layout.
    await vi.waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders nothing when the response has no topics', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue({ topics: [] });

    const { container } = render(<TrendingNews apiEndpoint={ENDPOINT} />);

    await vi.waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders topics with their articles in the full layout', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    render(<TrendingNews apiEndpoint={ENDPOINT} />);

    expect(await screen.findByText('Eclipse')).toBeTruthy();
    expect(screen.getByText('Elections')).toBeTruthy();
    const link = screen.getByText('Total eclipse crosses North America');
    expect(link.getAttribute('href')).toBe('https://example.com/a');
  });

  it('renders an article without a URL as plain text', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    render(<TrendingNews apiEndpoint={ENDPOINT} />);

    const plain = await screen.findByText('Where to watch');
    expect(plain.tagName).not.toBe('A');
  });

  it('pluralizes the article count', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    render(<TrendingNews apiEndpoint={ENDPOINT} />);

    expect(await screen.findByText('2 articles')).toBeTruthy();
    expect(screen.getByText('1 article')).toBeTruthy();
  });

  it('caps the rendered topics at maxTopics', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    render(<TrendingNews apiEndpoint={ENDPOINT} maxTopics={1} />);

    expect(await screen.findByText('Eclipse')).toBeTruthy();
    expect(screen.queryByText('Elections')).toBeNull();
  });

  it('renders the compact layout with a Trending header and topic cards', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    render(<TrendingNews apiEndpoint={ENDPOINT} compact />);

    expect(await screen.findByText('Trending')).toBeTruthy();
    const card = screen.getByText('Eclipse').closest('a');
    expect(card?.getAttribute('href')).toBe('https://example.com/a');
    // Headline of the first article is used as the card subtitle.
    expect(screen.getByText('Total eclipse crosses North America')).toBeTruthy();
  });

  it('renders a compact card for a topic with no articles', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    render(<TrendingNews apiEndpoint={ENDPOINT} compact />);

    const card = (await screen.findByText('Elections')).closest('a');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('href')).toBeNull();
  });

  it('applies the className and style props', async () => {
    vi.spyOn(trendingApi, 'getTrendingNews').mockResolvedValue(data());

    const { container } = render(
      <TrendingNews apiEndpoint={ENDPOINT} className="my-widget" style={{ background: 'red' }} />
    );

    await screen.findByText('Eclipse');
    const root = container.firstChild as HTMLElement;
    expect(root.className).toBe('my-widget');
    expect(root.style.background).toBe('red');
  });
});
