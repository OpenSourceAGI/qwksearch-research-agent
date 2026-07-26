import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ThinkTagProcessor from './ThinkTagProcessor';

/**
 * `ThinkTagProcessor` maps the custom `<think>` markdown tag in AI responses to
 * the collapsible reasoning panel. It simply forwards its children as the
 * reasoning content.
 */
const meta: Meta<typeof ThinkTagProcessor> = {
  title: 'Chat/ThinkTagProcessor',
  component: ThinkTagProcessor,
  parameters: { layout: 'padded' },
  args: {
    children:
      'Let me break this down: first the electrolyte chemistry, then the ' +
      'manufacturing bottlenecks, then who is shipping first.',
  },
};

export default meta;
type Story = StoryObj<typeof ThinkTagProcessor>;

export const Thinking: Story = {
  args: { thinkingEnded: false },
};

export const Ended: Story = {
  args: { thinkingEnded: true },
};
