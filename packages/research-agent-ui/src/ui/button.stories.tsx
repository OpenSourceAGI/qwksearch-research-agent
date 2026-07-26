import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Button } from './button';

/**
 * `Button` is the shadcn/Radix button primitive used across the UI. It supports
 * six visual `variant`s and four `size`s, and can render `asChild` to project
 * its styles onto a custom element (e.g. an anchor).
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Button',
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Destructive: Story = { args: { variant: 'destructive' } };

export const Outline: Story = { args: { variant: 'outline' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Link: Story = { args: { variant: 'link' } };

export const Disabled: Story = { args: { disabled: true } };

/** Icon-only button (square). */
export const Icon: Story = {
  args: { size: 'icon', children: <Trash2 className="size-4" />, 'aria-label': 'Delete' },
};

/** Icon + label. */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        Continue
        <ArrowRight className="size-4" />
      </>
    ),
  },
};

/** Every variant side by side. */
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="default">Default</Button>
      <Button {...args} variant="secondary">Secondary</Button>
      <Button {...args} variant="destructive">Destructive</Button>
      <Button {...args} variant="outline">Outline</Button>
      <Button {...args} variant="ghost">Ghost</Button>
      <Button {...args} variant="link">Link</Button>
    </div>
  ),
};

/** Every size side by side. */
export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="default">Default</Button>
      <Button {...args} size="lg">Large</Button>
      <Button {...args} size="icon" aria-label="Icon"><ArrowRight className="size-4" /></Button>
    </div>
  ),
};
