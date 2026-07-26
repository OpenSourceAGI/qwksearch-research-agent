import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ArticleFollowupQuestions from './ArticleFollowupQuestions';

/**
 * `ArticleFollowupQuestions` renders clickable, AI-suggested follow-up
 * questions for the open article. A leading "summarize" prompt is always
 * offered, and multi-question strings are split into individual chips.
 */
const meta: Meta<typeof ArticleFollowupQuestions> = {
  title: 'ArticleReader/ArticleFollowupQuestions',
  component: ArticleFollowupQuestions,
  parameters: { layout: 'padded' },
  args: {
    isLoading: false,
    error: '',
    onQuestionClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ArticleFollowupQuestions>;

export const Default: Story = {
  args: {
    questions: [
      'Which companies are closest to mass production?',
      'How do solid-state cells compare on energy density?',
      'What are the main manufacturing challenges?',
    ],
  },
};

/** A single string containing several questions is split automatically. */
export const AutoSplit: Story = {
  args: {
    questions: [
      'What is the cycle life? How hot can they run? Are they cheaper to make?',
    ],
  },
};

export const Empty: Story = {
  args: { questions: [] },
};
