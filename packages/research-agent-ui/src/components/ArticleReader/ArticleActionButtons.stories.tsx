import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ArticleActionButtons from './ArticleActionButtons';

/**
 * `ArticleActionButtons` is the toolbar at the top of the article extract
 * panel: Ask AI, Suggest, Copy, Highlight, Favorite, Open-in-new-tab, zoom
 * controls, and Close. Every button has a hover tooltip showing its keyboard
 * shortcut (e.g. `Alt+A`).
 */
const meta: Meta<typeof ArticleActionButtons> = {
  title: 'ArticleReader/ArticleActionButtons',
  component: ArticleActionButtons,
  parameters: { layout: 'padded' },
  args: {
    isLoadingAI: false,
    isLoadingFollowups: false,
    isLoadingFavorite: false,
    isFavorited: false,
    isHighlightMode: false,
    articleUrl: 'https://en.wikipedia.org/wiki/Solid-state_battery',
    fontScale: 1,
    onAskClick: fn(),
    onSuggestClick: fn(),
    onCopyClick: fn(),
    onFavoriteClick: fn(),
    onHighlightToggle: fn(),
    onZoomIn: fn(),
    onZoomOut: fn(),
    onZoomReset: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ArticleActionButtons>;

/** Default toolbar. Hover any button to see its tooltip + shortcut. */
export const Default: Story = {};

/** Highlight mode active and the article favorited. */
export const ActiveStates: Story = {
  args: { isHighlightMode: true, isFavorited: true },
};

/** AI request in flight (the Ask button shows a loading state). */
export const Loading: Story = {
  args: { isLoadingAI: true, isLoadingFollowups: true },
};

/** Zoomed in to 130%. */
export const ZoomedIn: Story = {
  args: { fontScale: 1.3 },
};

/** Without an article URL the open-in-new-tab button is hidden. */
export const NoUrl: Story = {
  args: { articleUrl: undefined },
};
