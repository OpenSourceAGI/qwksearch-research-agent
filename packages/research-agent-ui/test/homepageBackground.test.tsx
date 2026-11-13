/**
 * @fileoverview How the homepage picks its first background: a returning
 * visitor's comes straight out of the cache with no download, and a first
 * visit downloads nothing until the page has loaded and gone idle, then keeps
 * what it downloaded for next time.
 *
 * Everything on the homepage but the background is stubbed out; the cache and
 * the network are fakes the test can count calls on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { BACKGROUND_ARTWORKS } from '../src/components/ChatConversation/background-art';
import {
  readCachedBackgroundList,
  rememberCachedBackground,
} from '../src/components/ChatConversation/background-cache';

vi.mock('../src/hooks/useChat', () => ({ useChat: () => ({ sendMessage: vi.fn() }) }));
vi.mock('../src/components/MessageComposer/ChatInputBox', () => ({ default: () => null }));
vi.mock('../src/components/ChatConversation/RecentHistoryChips', () => ({ default: () => null }));
vi.mock('../src/components/Footer', () => ({ default: () => null }));
vi.mock('../src/ui/gradient-blur', () => ({ GradientBlur: () => null }));
vi.mock('quantum-sphere-loading-icon/react', () => ({ default: () => null }));

const { default: ChatHomepage } = await import(
  '../src/components/ChatConversation/ChatHomepage'
);

/** A Cache Storage stand-in: one bucket, keyed by URL. */
function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (url: string) => store.get(url)?.clone()),
    put: vi.fn(async (url: string, response: Response) => {
      store.set(url, response);
    }),
    delete: vi.fn(async (url: string) => store.delete(url)),
  };
  return { store, caches: { open: vi.fn(async () => cache) } };
}

/** jsdom never loads images, so a stand-in that "decodes" every one at once. */
class InstantImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = '';
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

const backgroundSrc = (container: HTMLElement) =>
  container.querySelector<HTMLImageElement | HTMLVideoElement>('.z-0 img, .z-0 video')
    ?.getAttribute('src');

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  let n = 0;
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:test/${++n}`),
    revokeObjectURL: vi.fn(),
  }));
  vi.stubGlobal('Image', InstantImage);
  // The site-wide news settings request, and any artwork download.
  fetchMock = vi.fn(async (url: string) =>
    url.startsWith('https://i.imgur.com/')
      ? new Response('art', { headers: { 'Content-Type': 'image/png' } })
      : new Response('null'),
  );
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem('showWeatherWidget', 'false');
  localStorage.setItem('showTrendingNewsWidget', 'false');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const artworkFetches = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).startsWith('https://i.imgur.com/'));

describe('the homepage background', () => {
  it('shows a cached piece on load without downloading one', async () => {
    const { caches, store } = fakeCaches();
    vi.stubGlobal('caches', caches);
    const cached = BACKGROUND_ARTWORKS[5];
    store.set(cached, new Response('art', { headers: { 'Content-Type': 'image/png' } }));
    rememberCachedBackground(cached);

    const { container } = render(<ChatHomepage />);

    await waitFor(() => expect(backgroundSrc(container)).toMatch(/^blob:/));
    expect(artworkFetches()).toHaveLength(0);
  });

  it('starts bare on a first visit, then downloads one piece and keeps it', async () => {
    vi.stubGlobal('caches', fakeCaches().caches);

    const { container } = render(<ChatHomepage />);

    expect(backgroundSrc(container)).toBeUndefined();
    expect(artworkFetches()).toHaveLength(0);

    // jsdom has no requestIdleCallback, so the start falls back to a timer.
    await waitFor(() => expect(backgroundSrc(container)).toMatch(/^blob:/), {
      timeout: 3000,
    });
    const [[first]] = artworkFetches();
    expect(readCachedBackgroundList()).toContain(first);
  });

  it('downloads nothing when the background art is switched off', async () => {
    vi.stubGlobal('caches', fakeCaches().caches);
    localStorage.setItem('showBackgroundArt', 'false');

    const { container } = render(<ChatHomepage />);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(backgroundSrc(container)).toBeUndefined();
    expect(artworkFetches()).toHaveLength(0);
  });
});
