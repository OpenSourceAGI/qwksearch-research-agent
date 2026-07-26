import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ArticleAIResponse from './ArticleAIResponse';

/**
 * `ArticleAIResponse` renders the AI answer to a question about the current
 * article. It shows a spinner while loading, the (HTML) response when ready,
 * and an error banner on failure.
 */
const meta: Meta<typeof ArticleAIResponse> = {
  title: 'ArticleReader/ArticleAIResponse',
  component: ArticleAIResponse,
  parameters: { layout: 'padded' },
  args: {
    response: '',
    isLoading: false,
    error: '',
  },
};

export default meta;
type Story = StoryObj<typeof ArticleAIResponse>;

export const Loading: Story = {
  args: { isLoading: true },
};

export const WithResponse: Story = {
  args: {
    response:
      '<p><strong>Summary:</strong></p><ul>' +
      '<li>Solid-state cells replace liquid electrolyte with a solid one.</li>' +
      '<li>Higher energy density and improved safety.</li>' +
      '<li>Pilot production targeted for 2027.</li></ul>',
  },
};

export const Error: Story = {
  args: { error: 'The model is temporarily unavailable. Please try again.' },
};
