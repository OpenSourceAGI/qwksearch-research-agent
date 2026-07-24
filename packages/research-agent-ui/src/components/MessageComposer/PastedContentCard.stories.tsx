import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PastedContentCard } from './PastedContentCard';

/**
 * `PastedContentCard` appears in the composer's attachment tray when a large
 * block of text (>300 chars) is pasted into the chat input.
 */
const meta: Meta<typeof PastedContentCard> = {
  title: 'Composer/PastedContentCard',
  component: PastedContentCard,
  args: {
    onRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PastedContentCard>;

export const Default: Story = {
  args: {
    content: {
      id: 'pasted-1',
      content:
        'Solid-state batteries use a solid electrolyte instead of the liquid or ' +
        'gel electrolytes found in conventional lithium-ion cells. This enables ' +
        'higher energy density, improved thermal stability, and the potential for ' +
        'lithium-metal anodes...',
      timestamp: new Date(),
    },
  },
};
