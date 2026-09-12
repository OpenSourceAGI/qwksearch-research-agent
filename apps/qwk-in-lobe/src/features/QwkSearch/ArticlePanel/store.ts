/**
 * State for the article extract side panel.
 *
 * The panel mirrors QwkSearch's `ExtractPanelContext`: it opens for a URL
 * (usually a citation clicked inside a chat message), extracts the article
 * through the Worker, and lets the reader ask questions, generate follow-ups
 * and favorite the page — all without leaving the conversation.
 */
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  addFavorite,
  ArticleApiError,
  type ArticleDTO,
  type ArticleQA,
  askArticle,
  fetchArticle,
  generateArticleFollowups,
  htmlToPlainText,
  listFavorites,
  removeFavorite,
  storeArticleQA,
  storeFollowUps,
} from './api';

export const ARTICLE_PANEL_DEFAULT_WIDTH = 520;
export const ARTICLE_PANEL_MIN_WIDTH = 360;

export type ArticlePanelErrorKind = 'extract' | 'generic' | 'loginRequired';

export interface ArticlePanelState {
  article?: ArticleDTO;
  asking: boolean;
  error?: ArticlePanelErrorKind;
  favoriteLoading: boolean;
  followups: string[];
  generatingFollowups: boolean;
  isFavorite: boolean;
  isOpen: boolean;
  loading: boolean;
  qa: ArticleQA[];
  searchText: string;
  url: string;
  width: number;
}

export interface ArticlePanelActions {
  ask: (question: string) => Promise<void>;
  closePanel: () => void;
  generateFollowups: () => Promise<void>;
  loadArticle: (url: string) => Promise<void>;
  openArticle: (url: string, searchText?: string) => void;
  setWidth: (width: number) => void;
  toggleFavorite: () => Promise<void>;
}

export type ArticlePanelStore = ArticlePanelState & ArticlePanelActions;

const initialState: ArticlePanelState = {
  article: undefined,
  asking: false,
  error: undefined,
  favoriteLoading: false,
  followups: [],
  generatingFollowups: false,
  isFavorite: false,
  isOpen: false,
  loading: false,
  qa: [],
  searchText: '',
  url: '',
  width: ARTICLE_PANEL_DEFAULT_WIDTH,
};

/** Markdown the panel renders: prefer the extracted markdown, else convert the cached HTML. */
export const articleBodyMarkdown = (article?: ArticleDTO): string => {
  if (!article) return '';
  if (article.content?.trim()) return article.content;
  if (article.html) return htmlToPlainText(article.html);
  return '';
};

const toErrorKind = (error: unknown): ArticlePanelErrorKind => {
  if (error instanceof ArticleApiError) {
    if (error.status === 401) return 'loginRequired';
    if (error.status === 400 || error.status === 502) return 'extract';
  }
  return 'generic';
};

const toChatHistory = (qa: ArticleQA[]) =>
  qa.flatMap((entry) => [
    { content: entry.question, role: 'user' as const },
    { content: entry.answer, role: 'assistant' as const },
  ]);

export const useArticlePanelStore = createWithEqualityFn<ArticlePanelStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      ask: async (question) => {
        const { article, qa, url } = get();
        const trimmed = question.trim();
        if (!article || !trimmed || get().asking) return;

        set({ asking: true, error: undefined });
        try {
          const { content } = await askArticle({
            article: articleBodyMarkdown(article),
            chatHistory: toChatHistory(qa),
            question: trimmed,
          });
          const entry = { answer: content, question: trimmed };
          set({ asking: false, qa: [...get().qa, entry] });
          void storeArticleQA(url, entry).catch(() => undefined);
        } catch (error) {
          set({ asking: false, error: toErrorKind(error) });
        }
      },

      closePanel: () => set({ isOpen: false }),

      generateFollowups: async () => {
        const { article, qa, url } = get();
        if (!article || get().generatingFollowups) return;

        set({ error: undefined, generatingFollowups: true });
        try {
          const { extract } = await generateArticleFollowups({
            article: articleBodyMarkdown(article),
            chatHistory: toChatHistory(qa),
          });
          set({ followups: extract, generatingFollowups: false });
          void storeFollowUps(url, extract).catch(() => undefined);
        } catch (error) {
          set({ error: toErrorKind(error), generatingFollowups: false });
        }
      },

      loadArticle: async (url) => {
        set({ article: undefined, error: undefined, followups: [], isFavorite: false, loading: true, qa: [] });
        try {
          const { article } = await fetchArticle(url);
          // A newer open() may have superseded this request.
          if (get().url !== url) return;

          set({
            article,
            followups: article.followUpQuestions ?? [],
            loading: false,
            qa: article.qaHistory ?? [],
          });

          try {
            const { favorites } = await listFavorites();
            if (get().url === url) set({ isFavorite: favorites.some((f) => f.url === url) });
          } catch {
            // Anonymous visitors simply see the favorite button as inactive.
          }
        } catch (error) {
          if (get().url !== url) return;
          set({ error: toErrorKind(error), loading: false });
        }
      },

      openArticle: (url, searchText = '') => {
        const sameArticle = get().url === url && !!get().article;
        set({ isOpen: true, searchText, url });
        if (!sameArticle) void get().loadArticle(url);
      },

      setWidth: (width) => set({ width: Math.max(ARTICLE_PANEL_MIN_WIDTH, Math.round(width)) }),

      toggleFavorite: async () => {
        const { article, isFavorite, url } = get();
        if (!article || get().favoriteLoading) return;

        set({ favoriteLoading: true });
        try {
          if (isFavorite) await removeFavorite(url);
          else await addFavorite(article);
          set({ favoriteLoading: false, isFavorite: !isFavorite });
        } catch (error) {
          set({ error: toErrorKind(error), favoriteLoading: false });
        }
      },
    }),
    {
      name: 'qwksearch-article-panel',
      partialize: (state) => ({ width: state.width }),
    },
  ),
  shallow,
);

/** Imperative entry point for code outside React (e.g. link interception). */
export const openArticlePanel = (url: string, searchText?: string) =>
  useArticlePanelStore.getState().openArticle(url, searchText);
