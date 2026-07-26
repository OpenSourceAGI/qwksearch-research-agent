import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ArticlePromptInput from './ArticlePromptInput';

/**
 * `ArticlePromptInput` is the single-line box for asking the AI a question
 * about the current article. It submits on Enter.
 */
const meta: Meta<typeof ArticlePromptInput> = {
  title: 'ArticleReader/ArticlePromptInput',
  component: ArticlePromptInput,
  parameters: { layout: 'padded' },
  args: {
    value: '',
    onChange: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ArticlePromptInput>;

export const Empty: Story = {};

export const WithText: Story = {
  args: { value: 'What are the main manufacturing challenges?' },
};

/** Fully interactive: the input is controlled by local state. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = React.useState('');
    return (
      <div className="w-96">
        <ArticlePromptInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
