import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './visually-hidden';
import { Button } from './button';
import { X } from 'lucide-react';

/**
 * `VisuallyHidden` hides content visually while keeping it available to screen
 * readers. Use it to give icon-only controls an accessible name, or to label a
 * dialog whose title is not shown.
 */
const meta: Meta<typeof VisuallyHidden> = {
  title: 'UI/VisuallyHidden',
  component: VisuallyHidden,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof VisuallyHidden>;

/**
 * The icon button has no visible text, but screen readers announce
 * "Close panel" from the visually-hidden label.
 */
export const AccessibleIconButton: Story = {
  render: () => (
    <Button variant="ghost" size="icon">
      <X className="size-4" />
      <VisuallyHidden>Close panel</VisuallyHidden>
    </Button>
  ),
};

/** The text is present in the DOM (and read aloud) but not painted. */
export const HiddenText: Story = {
  render: () => (
    <p className="text-sm">
      Visible text
      <VisuallyHidden> — plus this hidden note for assistive tech</VisuallyHidden>
    </p>
  ),
};
