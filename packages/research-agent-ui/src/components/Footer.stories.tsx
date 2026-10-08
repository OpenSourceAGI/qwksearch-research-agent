/**
 * @fileoverview Storybook stories for the Footer component covering the default icon bar, an icon-less variant, and an empty-links state.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Footer from './Footer';

/**
 * `Footer` renders a compact bar of links (with optional Lucide icons) pinned
 * to the bottom of the screen on a single line at every width; below `sm` the
 * icons are hidden so the labels still fit. `icon` values are Lucide icon names.
 */
const meta: Meta<typeof Footer> = {
  title: 'Misc/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    optionShowIcons: true,
    listFooterLinks: [
      { url: '/docs', text: 'Docs', icon: 'BookOpen' },
      { url: 'https://example.com/blog', text: 'Blog', icon: 'Newspaper' },
      { url: 'https://example.com/support', text: 'Support', icon: 'MessageCircle' },
      { url: '/#downloads', text: 'Downloads', icon: 'Download' },
      { url: '/legal/privacy', text: 'Privacy', icon: 'Lock' },
      { url: 'https://example.com/ethics', text: 'Ethics', icon: 'Bot' },
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
