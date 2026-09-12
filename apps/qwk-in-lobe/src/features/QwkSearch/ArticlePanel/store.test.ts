import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { articleBodyMarkdown, useArticlePanelStore } from './store';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('article panel store', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useArticlePanelStore.setState({
      article: undefined,
      asking: false,
      error: undefined,
      followups: [],
      isFavorite: false,
      isOpen: false,
      loading: false,
      qa: [],
      url: '',
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('opens the panel and loads the article with its history', async () => {
    fetchMock.mockImplementation(async (input: string) => {
      if (input.startsWith('/api/doc/article'))
        return jsonResponse({
          article: {
            content: '# Hello',
            followUpQuestions: ['Why?'],
            qaHistory: [{ answer: 'a', question: 'q' }],
            title: 'Hello',
            url: 'https://x.com/a',
          },
          cached: true,
        });
      if (input.startsWith('/api/doc/favorites'))
        return jsonResponse({ favorites: [{ id: 1, url: 'https://x.com/a' }] });
      throw new Error(`unexpected ${input}`);
    });

    useArticlePanelStore.getState().openArticle('https://x.com/a', 'quote');
    expect(useArticlePanelStore.getState().isOpen).toBe(true);
    expect(useArticlePanelStore.getState().loading).toBe(true);

    await flush();
    await flush();

    const state = useArticlePanelStore.getState();
    expect(state.loading).toBe(false);
    expect(state.article?.title).toBe('Hello');
    expect(state.followups).toEqual(['Why?']);
    expect(state.qa).toEqual([{ answer: 'a', question: 'q' }]);
    expect(state.isFavorite).toBe(true);
    expect(state.searchText).toBe('quote');
  });

  it('maps a 401 to loginRequired and 502 to extract errors', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'no' }, 502));
    useArticlePanelStore.setState({ url: 'https://x.com/b' });
    await useArticlePanelStore.getState().loadArticle('https://x.com/b');
    expect(useArticlePanelStore.getState().error).toBe('extract');

    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'auth' }, 401));
    useArticlePanelStore.setState({ url: 'https://x.com/c' });
    await useArticlePanelStore.getState().loadArticle('https://x.com/c');
    expect(useArticlePanelStore.getState().error).toBe('loginRequired');
  });

  it('asks a question, appends the answer and persists it', async () => {
    useArticlePanelStore.setState({
      article: { content: 'body', url: 'https://x.com/a' },
      url: 'https://x.com/a',
    });
    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input === '/api/agent/article-qa') {
        expect(JSON.parse(String(init?.body))).toMatchObject({ article: 'body', question: 'Why?' });
        return jsonResponse({ content: 'Because.', success: true });
      }
      if (input === '/api/doc/article') return jsonResponse({ success: true });
      throw new Error(`unexpected ${input}`);
    });

    await useArticlePanelStore.getState().ask('Why?');
    expect(useArticlePanelStore.getState().qa).toEqual([{ answer: 'Because.', question: 'Why?' }]);
    await flush();
    expect(fetchMock).toHaveBeenCalledWith('/api/doc/article', expect.objectContaining({ method: 'POST' }));
  });

  it('ignores stale responses after a newer article was opened', async () => {
    let resolveFirst: (value: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveFirst = resolve)));
    fetchMock.mockImplementation(async () =>
      jsonResponse({ article: { title: 'second', url: 'https://x.com/2' }, cached: false }),
    );

    const store = useArticlePanelStore.getState();
    store.openArticle('https://x.com/1');
    store.openArticle('https://x.com/2');
    await flush();
    resolveFirst(jsonResponse({ article: { title: 'first', url: 'https://x.com/1' }, cached: false }));
    await flush();

    expect(useArticlePanelStore.getState().article?.title).toBe('second');
  });
});

describe('articleBodyMarkdown', () => {
  it('prefers markdown content and falls back to html text', () => {
    expect(articleBodyMarkdown({ content: '# md', html: '<p>x</p>', url: 'u' })).toBe('# md');
    expect(articleBodyMarkdown({ html: '<h2>Head</h2><p>Para</p>', url: 'u' })).toBe('## Head\n\nPara');
    expect(articleBodyMarkdown(undefined)).toBe('');
  });
});
