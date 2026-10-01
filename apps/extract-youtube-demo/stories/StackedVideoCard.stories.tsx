import type { Meta, StoryObj } from '@storybook/react-vite';
import { StackedVideoCard } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { DEMO_FIELDS, STACK } from './fixtures';

/**
 * A stacked playlist as one card: a `<VideoCard>` with a `<StackNav>` pinned
 * over the thumbnail, flipping between the stack's members.
 *
 * Stacks come from YouTube descriptions. When one video's description links
 * another ("Part 2: https://youtu.be/…"), `buildVideoStacks` joins them, oldest
 * first, and the library stores each member's `stackKey` and `stackPosition`.
 * `<VideoGrid>` builds these cards for you. Use `StackedVideoCard` directly
 * only when you lay cards out yourself.
 *
 * `stackLabel` names each member in the flip control. The default is the
 * member's category, else "Part N".
 */
const meta = {
  title: 'Grid/StackedVideoCard',
  component: StackedVideoCard,
  args: { videos: STACK, customFields: DEMO_FIELDS, onToggleFavorite: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StackedVideoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The two linked 3Blue1Brown chapters. Use the arrows to flip. */
export const Default: Story = {};

/** Opens on the second member. */
export const StartOnSecond: Story = { args: { initialIndex: 1 } };

/** A custom label: "Chapter N" instead of the category. */
export const CustomLabel: Story = { args: { stackLabel: (_video, index) => `Chapter ${index + 1}` } };
