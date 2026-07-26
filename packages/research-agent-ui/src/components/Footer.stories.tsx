import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Footer from './Footer';

/**
 * `Footer` renders a compact bar of links (with optional Lucide icons) pinned
 * to the bottom of the screen. On small screens it collapses into an info icon
 * that reveals the links in a popover. `icon` values are Lucide icon names.
 */
const meta: Meta<typeof Footer> = {
  title: 'Misc/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    optionShowIcons: true,
    listFooterLinks: [
      { url: 'https://github.com', text: 'GitHub', icon: 'Github' },
      { url: 'https://example.com/blog', text: 'Blog', icon: 'Newspaper' },
      { url: 'https://example.com/docs', text: 'Docs', icon: 'BookOpen' },
      { url: 'mailto:hi@example.com', text: 'Contact', icon: 'Mail' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Default: Story = {};

export const WithoutIcons: Story = {
  args: { optionShowIcons: false },
};

export const Empty: Story = {
  args: { listFooterLinks: [] },
};
