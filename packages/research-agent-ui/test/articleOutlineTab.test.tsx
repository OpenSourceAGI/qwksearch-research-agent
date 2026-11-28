/**
 * @fileoverview The reading-mode sidebar's Outline tab: the tab switcher's
 * keyboard and ARIA behaviour, the Fumadocs table of contents it shows, and
 * that the Questions panel keeps its content when the tabs are added.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

vi.mock('qwksearch-api-client', () => ({
  getArticle: vi.fn(async () => ({
    data: {
      article: {
        title: 'Navigating Long Documents',
        html: '<h1>Navigating</h1><p>Opening paragraph that is long enough to count.</p><h2>Background</h2><p>More prose here.</p><h3>Detail</h3><p>Even more.</p><h4>Skipped</h4>',
        followUpQuestions: ['What is the main argument?'],
      },
    },
  })),
  updateArticle: vi.fn(),
  listFavorites: vi.fn(async () => ({ data: { favorites: [] } })),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  articleQa: vi.fn(),
  articleFollowups: vi.fn(),
}));
vi.mock('../src/hooks/useSession', () => ({ useSession: () => ({ isAuthenticated: false }) }));
vi.mock('../src/hooks/useChat', () => ({ useChat: () => ({ chatModelProvider: null }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const { default: ArticleSidebarTabs, articleTabIds } = await import(
  '../src/components/ArticleReader/ArticleSidebarTabs'
);
const { default: ArticleOutline } = await import('../src/components/ArticleReader/ArticleOutline');
const { default: ArticleExtractPanel } = await import('../src/components/ArticleReader/ArticleExtractPanel');
const { ExtractPanelProvider } = await import('../src/components/ArticleReader/ExtractPanelContext');

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Tabs() {
  const [value, setValue] = useState<'questions' | 'outline'>('questions');
  return <ArticleSidebarTabs value={value} onValueChange={setValue} idBase="t" />;
}

describe('ArticleSidebarTabs', () => {
  it('is a tablist with the active tab selected and the only tab stop', () => {
    render(<Tabs />);
    expect(screen.getByRole('tablist')).toBeTruthy();
    const questions = screen.getByRole('tab', { name: 'Questions' });
    const outline = screen.getByRole('tab', { name: 'Outline' });
    expect(questions.getAttribute('aria-selected')).toBe('true');
    expect(outline.getAttribute('aria-selected')).toBe('false');
    expect(questions.tabIndex).toBe(0);
    expect(outline.tabIndex).toBe(-1);
    expect(questions.getAttribute('aria-controls')).toBe(articleTabIds('t', 'questions').panel);
  });

  it('moves and selects with the arrow, Home and End keys, wrapping at the ends', () => {
    render(<Tabs />);
    const questions = screen.getByRole('tab', { name: 'Questions' });
    const outline = screen.getByRole('tab', { name: 'Outline' });

    fireEvent.keyDown(questions, { key: 'ArrowRight' });
    expect(outline.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(outline);

    fireEvent.keyDown(outline, { key: 'ArrowRight' });
    expect(questions.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(questions, { key: 'ArrowLeft' });
    expect(outline.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(outline, { key: 'Home' });
    expect(questions.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(questions, { key: 'End' });
    expect(outline.getAttribute('aria-selected')).toBe('true');
  });

  it('selects on click', () => {
    render(<Tabs />);
    fireEvent.click(screen.getByRole('tab', { name: 'Outline' }));
    expect(screen.getByRole('tab', { name: 'Outline' }).getAttribute('aria-selected')).toBe('true');
  });
});

describe('ArticleOutline', () => {
  const items = [
    { title: 'Intro', url: '#intro', depth: 1 },
    { title: 'Method', url: '#method', depth: 2 },
  ];

  it('lists each heading as a link to its anchor', () => {
    render(<ArticleOutline items={items} />);
    expect(screen.getByRole('link', { name: 'Intro' }).getAttribute('href')).toBe('#intro');
    expect(screen.getByRole('link', { name: 'Method' }).getAttribute('href')).toBe('#method');
  });

  it('scrolls to the heading and focuses it when an entry is clicked', () => {
    const heading = document.createElement('h2');
    heading.id = 'method';
    heading.textContent = 'Method';
    document.body.appendChild(heading);
    const scrollIntoView = vi.fn();
    heading.scrollIntoView = scrollIntoView;

    render(<ArticleOutline items={items} />);
    fireEvent.click(screen.getByRole('link', { name: 'Method' }));

    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
    expect(document.activeElement).toBe(heading);
    heading.remove();
  });

  it('says so when there are no headings', () => {
    render(<ArticleOutline items={[]} />);
    expect(screen.getByText('No Headings')).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});

describe('ArticleExtractPanel sidebar tabs', () => {
  function renderPanel() {
    return render(
      <ExtractPanelProvider>
        <ArticleExtractPanel isOpen url="https://example.com/articles/outline-demo" onClose={() => {}} />
      </ExtractPanelProvider>,
    );
  }

  it('shows Questions first, unchanged, and the article headings under Outline', async () => {
    renderPanel();

    const questionsTab = await screen.findByRole('tab', { name: 'Questions' });
    const outlineTab = screen.getByRole('tab', { name: 'Outline' });
    expect(questionsTab.getAttribute('aria-selected')).toBe('true');

    const questionsPanel = document.getElementById(questionsTab.getAttribute('aria-controls')!)!;
    const outlinePanel = document.getElementById(outlineTab.getAttribute('aria-controls')!)!;
    await waitFor(() => expect(screen.getByText('What is the main argument?')).toBeTruthy());
    expect(questionsPanel.hidden).toBe(false);
    expect(outlinePanel.hidden).toBe(true);
    expect(questionsPanel.getAttribute('role')).toBe('tabpanel');
    expect(questionsPanel.getAttribute('aria-labelledby')).toBe(questionsTab.id);

    fireEvent.click(outlineTab);
    expect(outlinePanel.hidden).toBe(false);
    expect(questionsPanel.hidden).toBe(true);

    await waitFor(() => {
      const links = Array.from(outlinePanel.querySelectorAll('a')).map((a) => a.textContent);
      expect(links).toEqual(['Navigating', 'Background', 'Detail']);
    });

    fireEvent.click(questionsTab);
    expect(questionsPanel.hidden).toBe(false);
    expect(screen.getByText('What is the main argument?')).toBeTruthy();
  });

  it('ties every outline link to a heading in the article', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('tab', { name: 'Outline' }));

    const links = await waitFor(() => {
      const found = Array.from(document.querySelectorAll<HTMLAnchorElement>('[role="tabpanel"] a[href^="#"]'));
      expect(found.length).toBe(3);
      return found;
    });
    for (const link of links) {
      const target = document.getElementById(decodeURIComponent(link.getAttribute('href')!.slice(1)));
      expect(target?.tagName).toMatch(/^H[123]$/);
    }
  });
});
