import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ThinkBox from './MessageReasoningPanel';

/**
 * `MessageReasoningPanel` (ThinkBox) is the collapsible panel that shows the
 * model's internal reasoning extracted from `<think>` tags. It stays expanded
 * while thinking and auto-collapses once `thinkingEnded` becomes true.
 */
const meta: Meta<typeof ThinkBox> = {
  title: 'Chat/MessageReasoningPanel',
  component: ThinkBox,
  parameters: { layout: 'padded' },
  args: {
    content:
      'The question is about solid-state batteries. I should cover the ' +
      'electrolyte type, energy density, and the production timeline before ' +
      'summarizing the key players.',
  },
};

export default meta;
type Story = StoryObj<typeof ThinkBox>;

/** Actively thinking — panel is expanded. */
export const Thinking: Story = {
  args: { thinkingEnded: false },
};

/** Finished — panel auto-collapses. */
export const Ended: Story = {
  args: { thinkingEnded: true },
};
