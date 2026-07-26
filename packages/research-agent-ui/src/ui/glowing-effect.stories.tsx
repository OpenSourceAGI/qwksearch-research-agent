import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlowingEffect } from './glowing-effect';

/**
 * `GlowingEffect` paints an animated conic-gradient border that tracks the
 * pointer. It positions itself absolutely, so it must live inside a
 * `relative`, rounded container. Set `disabled={false}` and `glow` to see the
 * pointer-reactive glow.
 */
const meta: Meta<typeof GlowingEffect> = {
  title: 'UI/GlowingEffect',
  component: GlowingEffect,
  parameters: { layout: 'centered' },
  argTypes: {
    spread: { control: { type: 'range', min: 5, max: 60, step: 1 } },
    borderWidth: { control: { type: 'range', min: 1, max: 6, step: 1 } },
    proximity: { control: { type: 'range', min: 0, max: 120, step: 5 } },
  },
};

export default meta;
type Story = StoryObj<typeof GlowingEffect>;

/** Move the pointer near the card to activate the glow. */
export const OnCard: Story = {
  args: {
    disabled: false,
    glow: true,
    spread: 40,
    borderWidth: 2,
    proximity: 64,
  },
  render: (args) => (
    <div className="relative h-40 w-72 rounded-2xl border border-border bg-card p-6">
      <GlowingEffect {...args} />
      <div className="relative">
        <p className="text-sm font-semibold">Research card</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hover near this card to trace the glowing border.
        </p>
      </div>
    </div>
  ),
};
