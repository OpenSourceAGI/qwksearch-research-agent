import type { Meta, StoryObj } from '@storybook/react-vite';
import { GridStylesProvider, StackNav } from 'extract-youtube/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

/**
 * The `<` / `>` control that flips a stacked playlist, with a position counter
 * and the current member's label. It wraps at both ends and renders nothing
 * for a stack of one.
 *
 * `variant="overlay"` pins it over a card's thumbnail (what
 * `<StackedVideoCard>` uses). `variant="inline"` sits in a table row (what
 * `<VideoList>` uses). Its buttons stop click propagation, so flipping inside
 * a clickable row never also plays the row.
 *
 * It ships unstyled outside the grid components, so wrap it in
 * `<GridStylesProvider>` when you use it on its own.
 */
const meta = {
  title: 'Grid/StackNav',
  component: StackNav,
  args: { index: 0, count: 3, label: 'Part 1', variant: 'inline', onSelect: fn() },
  decorators: [
    (Story) => (
      <GridStylesProvider>
        <div style={{ position: 'relative', width: 280, height: 60 }}>
          <Story />
        </div>
      </GridStylesProvider>
    ),
  ],
} satisfies Meta<typeof StackNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static: change `index` and `count` from Controls. */
export const Inline: Story = {};

/** The overlay variant, as it sits on a card's thumbnail. */
export const Overlay: Story = {
  args: { variant: 'overlay' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 280, aspectRatio: '16 / 9', background: '#1f2937', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

/** Wired to state, so the arrows move through five parts and wrap. */
export const Interactive: Story = {
  render: (args) => {
    const [index, setIndex] = useState(0);
    return <StackNav {...args} index={index} count={5} label={`Part ${index + 1}`} onSelect={setIndex} />;
  },
};

/** A stack of one renders nothing. */
export const SingleVideo: Story = { args: { count: 1 } };
