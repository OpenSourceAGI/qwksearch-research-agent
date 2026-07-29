/**
 * @fileoverview Storybook stories for the ArticlePanelHeader component's default close-button state.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ArticlePanelHeader from './ArticlePanelHeader';

/**
 * `ArticlePanelHeader` is the minimal top bar of the article extract panel,
 * containing just a close button.
 */
const meta: Meta<typeof ArticlePanelHeader> = {
  title: 'ArticleReader/ArticlePanelHeader',
  component: ArticlePanelHeader,
  parameters: { layout: 'fullscreen' },
  args: {
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ArticlePanelHeader>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <ArticlePanelHeader {...args} />
    </div>
  ),
};
