/**
 * @fileoverview Storybook stories for the FollowUpSuggestions component covering the default three-suggestion case and a many-suggestions case that exceeds the five keyboard-shortcut slots.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import FollowUpSuggestions from './FollowUpSuggestions';
import { mockSection } from '../../../stories/mocks';

/**
 * `FollowUpSuggestions` renders the assistant's suggested next questions as
 * clickable chips (keyboard shortcuts 1–5 also trigger them).
 */
const meta: Meta<typeof FollowUpSuggestions> = {
  title: 'Chat/FollowUpSuggestions',
  component: FollowUpSuggestions,
  parameters: { layout: 'padded' },
  args: {
    sendMessage: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FollowUpSuggestions>;

/** Three follow-up suggestions on the last message in the thread. */
export const Default: Story = {
  args: {
    section: mockSection,
    isLast: true,
    loading: false,
  },
};

/** Many suggestions — only the first five are keyboard-shortcut enabled. */
export const ManySuggestions: Story = {
  args: {
    section: {
      ...mockSection,
      suggestions: [
        'Which companies are closest to mass production?',
        'How do solid-state cells compare on energy density?',
        'What are the main manufacturing challenges?',
        'What is the projected cost per kWh?',
        'How does cycle life compare to current Li-ion?',
        'What safety advantages do solid electrolytes offer?',
      ],
    },
    isLast: true,
    loading: false,
  },
};
