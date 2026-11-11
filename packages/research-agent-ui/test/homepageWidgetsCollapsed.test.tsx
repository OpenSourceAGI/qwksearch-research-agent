/**
 * @fileoverview The Learn (education playlists) and news widgets on the
 * homepage start collapsed. Both packages only offer a collapsed state with a
 * chevron toggle in `compact` mode; without it they render fully open with no
 * way to fold them, which is how they regressed once already.
 *
 * The widgets are stubs that record the props the homepage hands them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const received = vi.hoisted(() => ({
  education: [] as Record<string, unknown>[],
  news: [] as Record<string, unknown>[],
}));

vi.mock('../src/hooks/useChat', () => ({ useChat: () => ({ sendMessage: vi.fn() }) }));
vi.mock('../src/components/MessageComposer/ChatInputBox', () => ({ default: () => null }));
vi.mock('../src/components/ChatConversation/RecentHistoryChips', () => ({ default: () => null }));
vi.mock('../src/components/Footer', () => ({ default: () => null }));
vi.mock('../src/ui/gradient-blur', () => ({ GradientBlur: () => null }));
vi.mock('quantum-sphere-loading-icon/react', () => ({ default: () => null }));
vi.mock('education-playlists', () => ({
  EducationPlaylists: (props: Record<string, unknown>) => {
    received.education.push(props);
    return null;
  },
}));
vi.mock('trending-news-api', () => ({
  TrendingNews: (props: Record<string, unknown>) => {
    received.news.push(props);
    return null;
  },
}));

const { default: ChatHomepage } = await import(
  '../src/components/ChatConversation/ChatHomepage'
);

beforeEach(() => {
  received.education.length = 0;
  received.news.length = 0;
  localStorage.clear();
  localStorage.setItem('showWeatherWidget', 'false');
  localStorage.setItem('trendingNewsApiUrl', 'https://news.example/api');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('null')));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('homepage widgets', () => {
  it('renders the education playlists and news widgets collapsed, with a toggle', async () => {
    render(<ChatHomepage />);

    await waitFor(() => {
      expect(received.education.length).toBeGreaterThan(0);
      expect(received.news.length).toBeGreaterThan(0);
    }, { timeout: 4000 });

    expect(received.education.at(-1)).toMatchObject({ compact: true });
    expect(received.news.at(-1)).toMatchObject({ compact: true, expandable: true });
  });
});
