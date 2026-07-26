import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HistoryChatItem } from './HistoryChatItem';
import type { Chat } from '../../types/research';

/**
 * `HistoryChatItem` is a single row in the chat-history dropdown: title,
 * relative timestamp, question-count badge, and hover-revealed pin/delete
 * actions.
 */
const baseChat: Chat = {
  id: 'chat-1',
  title: 'Solid-state battery breakthroughs',
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  focusMode: 'webSearch',
  messageCount: 4,
};

const meta: Meta<typeof HistoryChatItem> = {
  title: 'ChatHistory/HistoryChatItem',
  component: HistoryChatItem,
  parameters: { layout: 'padded' },
  args: {
    chat: baseChat,
    isPinned: false,
    onTogglePin: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-72 rounded-lg border border-border p-1">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HistoryChatItem>;

export const Default: Story = {};

export const Pinned: Story = {
  args: { isPinned: true },
};

export const NoMessages: Story = {
  args: { chat: { ...baseChat, messageCount: 0, title: 'Empty draft chat' } },
};

export const LongTitle: Story = {
  args: {
    chat: {
      ...baseChat,
      title:
        'A very long conversation title that should be truncated with an ellipsis when it overflows the row',
    },
  },
};
