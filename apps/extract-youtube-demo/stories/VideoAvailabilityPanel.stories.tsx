import type { Meta, StoryObj } from '@storybook/react-vite';
import { VideoAvailabilityPanel } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { makeClient } from './fixtures';

/**
 * Videos YouTube no longer plays: private, not embeddable, or removed.
 *
 * Availability is set by Resync (from the YouTube Data API's `status`) or by
 * hand in the edit dialog. A public page can leave them out by listing with
 * `availability: 'available'` (the live demo's grid does), and this panel is
 * where an admin decides what to do with each one: **Mark available** if it
 * came back, or **Remove** to delete it and record an exclusion so imports
 * skip it.
 *
 * It reads `GET /availability` and writes through the same `client` as
 * `<VideoLibraryAdmin>`.
 */
const meta = {
  title: 'Admin/VideoAvailabilityPanel',
  component: VideoAvailabilityPanel,
  args: { onChange: fn() },
} satisfies Meta<typeof VideoAvailabilityPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The demo library has one removed video. */
export const Default: Story = { args: { client: makeClient() } };

/** Nothing unavailable: the panel says so. */
export const AllAvailable: Story = { args: { client: makeClient({ empty: true }) } };
