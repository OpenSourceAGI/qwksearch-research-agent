import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { Button } from './button';

/**
 * `Tooltip` (Radix) shows a short hint on hover/focus. The library default
 * `delayDuration` is `0`, so tips appear immediately. Wrap a trigger with
 * `TooltipTrigger asChild` to keep your own element as the anchor.
 */
const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const OnButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Helpful hint</TooltipContent>
    </Tooltip>
  ),
};

/** Tooltip with a keyboard-shortcut hint, mirroring the article toolbar. */
export const WithShortcut: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Info">
          <Info className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="flex items-center gap-1.5">
          More info
          <kbd className="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-semibold">
            Alt+I
          </kbd>
        </span>
      </TooltipContent>
    </Tooltip>
  ),
};

/** Placement on all four sides. */
export const Sides: Story = {
  render: () => (
    <div className="flex gap-4">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};
