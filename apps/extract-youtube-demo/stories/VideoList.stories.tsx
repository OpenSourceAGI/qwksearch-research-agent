import type { Meta, StoryObj } from '@storybook/react-vite';
import { VideoList, groupByCustomField } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { AVAILABLE, DEMO_FIELDS, STACKS } from './fixtures';

/**
 * The library as a table: sortable, resizable columns, a row click that
 * plays, stacked playlists flipped inline, and optional grouping into a tree.
 *
 * Columns are title, channel, date and views, plus one per custom field
 * marked `showInList`. Click a header to sort. Title and channel open A→Z,
 * the rest newest or largest first, and a second click flips the order. Drag
 * a header's edge to resize it.
 *
 * `groupBy` nests rows under headings, outermost first. The built-ins are
 * `'year'`, `'channel'` and `'category'`, and `groupByCustomField(key)`
 * groups by one of yours. The L1…Ln buttons collapse the tree to a level, and
 * `defaultCollapseDepth` sets where it starts.
 */
const meta = {
  title: 'Grid/VideoList',
  component: VideoList,
  args: {
    videos: AVAILABLE,
    stacks: STACKS,
    customFields: DEMO_FIELDS,
    onToggleFavorite: fn(),
    onHide: fn(),
  },
} satisfies Meta<typeof VideoList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A flat, sortable list. */
export const Flat: Story = {};

/** Grouped by year, then by channel. */
export const ByYearAndChannel: Story = { args: { groupBy: ['year', 'channel'] } };

/** Grouped by category, then by the custom `level` field, starting collapsed to categories. */
export const ByCustomField: Story = {
  args: { groupBy: ['category', groupByCustomField('level', { skipEmpty: true })], defaultCollapseDepth: 1 },
};

/** Grouped by the custom `speaker` field. Videos with no speaker land under "Unsorted". */
export const BySpeaker: Story = { args: { groupBy: [groupByCustomField('speaker')] } };

/** Sorted by views, most first, with thumbnails in the rows. */
export const ByViewsWithThumbnails: Story = { args: { defaultSort: { column: 'views', direction: 'desc' }, showThumbnails: true } };

/** Without the channel column, for a single-channel library. */
export const NoChannelColumn: Story = { args: { hideChannelColumn: true } };

export const Empty: Story = { args: { videos: [], emptyState: 'Nothing here yet.' } };
