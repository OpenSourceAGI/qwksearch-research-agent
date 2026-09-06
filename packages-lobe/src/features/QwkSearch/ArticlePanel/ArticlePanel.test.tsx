/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useArticlePanelStore } from './store';

// The panel chrome (drag/resize) and the markdown renderer are third-party and
// not what these tests are about — replace them with transparent stand-ins.
vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DraggablePanel: ({ children, expand }: { children: ReactNode; expand?: boolean }) =>
    expand ? <div data-testid={'panel'}>{children}</div> : null,
  Markdown: ({ children }: { children: ReactNode }) => <div data-testid={'markdown'}>{children}</div>,
}));

vi.mock('antd-style', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createStaticStyles: () => new Proxy({}, { get: (_, key) => String(key) }),
  cssVar: new Proxy({}, { get: (_, token) => `var(--${String(token)})` }),
  cx: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const ArticlePanel = (await import('./ArticlePanel')).default;

const resetStore = (overrides = {}) =>
  useArticlePanelStore.setState({
    article: undefined,
    asking: false,
    error: undefined,
    favoriteLoading: false,
    followups: [],
    generatingFollowups: false,
    isFavorite: false,
    isOpen: true,
    loading: false,
    qa: [],
    searchText: '',
    url: '',
    width: 520,
    ...overrides,
  });

describe('ArticlePanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
    resetStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing while closed', () => {
    resetStore({ isOpen: false });
    render(<ArticlePanel />);
    expect(screen.queryByTestId('panel')).toBeNull();
  });

  it('shows the empty state before an article is opened', () => {
    render(<ArticlePanel />);
    expect(screen.getByText('article.empty')).toBeTruthy();
  });

  it('shows a loading message while extracting', () => {
    resetStore({ loading: true, url: 'https://x.com/a' });
    render(<ArticlePanel />);
    expect(screen.getByText('article.loading')).toBeTruthy();
  });

  it('renders the article body, source and word count', () => {
    resetStore({
      article: {
        content: '# Extracted body',
        source: 'example.com',
        title: 'A headline',
        url: 'https://example.com/a',
        via: 'scraper',
        word_count: 420,
      },
      url: 'https://example.com/a',
    });

    render(<ArticlePanel />);

    expect(screen.getByText('A headline')).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
    expect(screen.getByText('article.wordCount')).toBeTruthy();
    expect(screen.getByText('article.via.scraper')).toBeTruthy();
    expect(screen.getByTestId('markdown').textContent).toContain('# Extracted body');
  });

  it('renders stored questions, answers and follow-up suggestions', () => {
    resetStore({
      article: { content: 'body', url: 'https://x.com/a' },
      followups: ['What happens next in this story?'],
      qa: [{ answer: 'Because of the data.', question: 'Why did it happen?' }],
      url: 'https://x.com/a',
    });

    render(<ArticlePanel />);

    expect(screen.getByText('Why did it happen?')).toBeTruthy();
    expect(screen.getByText('What happens next in this story?')).toBeTruthy();
    expect(
      screen.getAllByTestId('markdown').some((el) => el.textContent === 'Because of the data.'),
    ).toBe(true);
  });

  it('asks a follow-up question when its suggestion is clicked', () => {
    const ask = vi.fn();
    resetStore({
      article: { content: 'body', url: 'https://x.com/a' },
      followups: ['What happens next in this story?'],
      url: 'https://x.com/a',
    });
    useArticlePanelStore.setState({ ask });

    render(<ArticlePanel />);
    fireEvent.click(screen.getByText('What happens next in this story?'));

    expect(ask).toHaveBeenCalledWith('What happens next in this story?');
  });

  it('closes the panel from the header', () => {
    resetStore({ article: { content: 'body', url: 'https://x.com/a' }, url: 'https://x.com/a' });
    render(<ArticlePanel />);

    fireEvent.click(screen.getByLabelText('article.actions.close'));

    expect(useArticlePanelStore.getState().isOpen).toBe(false);
  });

  it('surfaces a sign-in prompt when the API rejects an anonymous reader', () => {
    resetStore({ error: 'loginRequired', url: 'https://x.com/a' });
    render(<ArticlePanel />);
    expect(screen.getByText('article.error.loginRequired')).toBeTruthy();
  });
});
