import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Loader from './Loader';

/**
 * `Loader` is the spinning SVG used as an inline loading indicator. It inherits
 * its color from the surrounding text (`text-*`) and its size from `w-*`/`h-*`
 * utility classes on a wrapper.
 */
const meta: Meta<typeof Loader> = {
  title: 'UI/Loader',
  component: Loader,
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Default: Story = {};

/** Recolored via a wrapper's text color. */
export const Colored: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-primary">
      <Loader />
      <span className="text-blue-500">
        <Loader />
      </span>
      <span className="text-emerald-500">
        <Loader />
      </span>
    </div>
  ),
};

/** In context next to a label. */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-3 text-muted-foreground">
      <Loader />
      <span className="text-sm">Researching…</span>
    </div>
  ),
};
