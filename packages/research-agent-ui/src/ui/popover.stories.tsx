import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';

/**
 * `Popover` (Radix) is the floating panel used for lightweight menus and
 * inline settings that don't warrant a full modal.
 */
const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <p className="text-sm font-medium">Search options</p>
          <p className="text-sm text-muted-foreground">
            Configure how deeply the agent researches before answering.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
