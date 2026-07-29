/**
 * @fileoverview Storybook story for `CopyMessageButton`.
 *
 * Demonstrates the default copy-to-clipboard button rendered with a mock assistant message section.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Copy from './CopyMessageButton';
import { mockSection } from '../../stories/mocks';

/**
 * `CopyMessageButton` copies an assistant message plus its citation URLs to the
 * clipboard and briefly swaps its icon to a checkmark to confirm. Hover to see
 * the tooltip; click to copy.
 */
const meta: Meta<typeof Copy> = {
  title: 'MessageActions/CopyMessageButton',
  component: Copy,
  parameters: { layout: 'centered' },
  args: {
    section: mockSection as any,
    initialMessage: mockSection.assistantMessage?.content ?? '',
  },
};

export default meta;
type Story = StoryObj<typeof Copy>;

export const Default: Story = {};
