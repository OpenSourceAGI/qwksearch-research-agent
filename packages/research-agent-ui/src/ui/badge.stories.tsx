import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Sparkles } from 'lucide-react';
import { Badge } from './badge';

/**
 * `Badge` is a small inline label used for statuses, tags, and callouts
 * ("New", "Beta", counts). It supports several color variants and can render
 * `asChild` (e.g. as a link).
 */
const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: {
    children: 'Badge',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'new', 'beta', 'highlight'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const New: Story = { args: { variant: 'new', children: 'New' } };
export const Beta: Story = { args: { variant: 'beta', children: 'Beta' } };
export const Highlight: Story = { args: { variant: 'highlight', children: 'Highlight' } };

/** Badge with a leading icon. */
export const WithIcon: Story = {
  args: {
    variant: 'new',
    children: (
      <>
        <Sparkles />
        AI
      </>
    ),
  },
};

/** All variants together. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="new">New</Badge>
      <Badge variant="beta">Beta</Badge>
      <Badge variant="highlight">
        <Check />
        Done
      </Badge>
    </div>
  ),
};
