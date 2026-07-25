import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SearchProgressIndicator from './SearchProgressIndicator';
import { mockSearchQueries } from '../../stories/mocks';

/**
 * `SearchProgressIndicator` shows the live web/academic/news queries the agent
 * runs while researching, with per-query running / done status.
 */
const meta: Meta<typeof SearchProgressIndicator> = {
  title: 'Chat/SearchProgressIndicator',
  component: SearchProgressIndicator,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SearchProgressIndicator>;

/** Mid-search: some queries done, one still running. */
export const Searching: Story = {
  args: {
    queries: mockSearchQueries,
    loading: true,
  },
};

/** All queries completed. */
export const Completed: Story = {
  args: {
    queries: mockSearchQueries.map((q) => ({ ...q, status: 'done' as const })),
    loading: false,
  },
};

/** A single query in flight. */
export const SingleQuery: Story = {
  args: {
    queries: [
      { query: 'solid-state battery breakthroughs 2026', category: 'Web', status: 'running' },
    ],
    loading: true,
  },
};
