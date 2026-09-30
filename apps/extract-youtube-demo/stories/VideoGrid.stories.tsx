import type { Meta, StoryObj } from '@storybook/react-vite';
import { VideoGrid } from 'extract-youtube/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { AVAILABLE, DEMO_FIELDS, STACKS } from './fixtures';

/**
 * A responsive grid of `<VideoCard>`s, with stacked playlists folded into
 * one `<StackedVideoCard>` each.
 *
 * Pass `videos` in the order to show them. Pass `stacks` (stack key to
 * members, as `useVideoLibrary()` or the API's `/stacks` returns it) so a
 * stack whose other members are not on this page still flips through all of
 * them. Without `stacks`, the grid forms stacks from the description links in
 * `videos` itself.
 *
 * All the card actions (`favorites`, `onToggleFavorite`, `onHide`,
 * `customFields`, `transcriptUrl`, and the rest) are passed through to every
 * card. The stylesheet is injected once for the whole grid.
 */
const meta = {
  title: 'Grid/VideoGrid',
  component: VideoGrid,
  args: {
    videos: AVAILABLE,
    stacks: STACKS,
    customFields: DEMO_FIELDS,
    onToggleFavorite: fn(),
    onHide: fn(),
    onBadgeClick: fn(),
  },
} satisfies Meta<typeof VideoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The demo library: ten videos, the two 3Blue1Brown chapters stacked into one card. */
export const Default: Story = {};

/** `stacksEnabled={false}` shows every video as its own card. */
export const StacksOff: Story = { args: { stacksEnabled: false } };

/** Wider cards with descriptions. `minCardWidth` sets the column width. */
export const Roomy: Story = { args: { minCardWidth: 320, showDescription: true } };

/** Compact text cards, no thumbnails. */
export const NoThumbnails: Story = { args: { showThumbnails: false, minCardWidth: 200 } };

/** Favorites and hiding wired to state, the way an app keeps them. */
export const WithState: Story = {
  render: (args) => {
    const [favorites, setFavorites] = useState<string[]>(['UF8uR6Z6KLc']);
    const [hidden, setHidden] = useState<string[]>([]);
    const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
    return (
      <VideoGrid
        {...args}
        favorites={favorites}
        hidden={hidden}
        onToggleFavorite={(id) => setFavorites((list) => toggle(list, id))}
        onHide={(id) => setHidden((list) => [...list, id])}
        onUnhide={(id) => setHidden((list) => list.filter((item) => item !== id))}
      />
    );
  },
};

/** What renders when `videos` is empty. */
export const Empty: Story = { args: { videos: [], emptyState: 'No videos match your filters.' } };
