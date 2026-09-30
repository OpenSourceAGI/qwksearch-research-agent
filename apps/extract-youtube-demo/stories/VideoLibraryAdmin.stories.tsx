import type { Meta, StoryObj } from '@storybook/react-vite';
import { VideoLibraryAdmin } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { DEMO_FIELDS, makeClient } from './fixtures';

/**
 * The admin screen for a video library: a searchable, sortable, paged table
 * of every video (hidden ones included), with add, edit, feature, delete and
 * the maintenance actions.
 *
 * - **Filters**: search (debounced), category, availability and "Top picks
 *   only". Each maps to a query param on `GET /videos`.
 * - **Row actions**: the star toggles `featured`. The pencil opens
 *   `<VideoEditDialog>`. The bin deletes after a confirm and records an
 *   exclusion, so a later import will not bring the video back.
 * - **Resync** refreshes view counts and availability from the YouTube Data
 *   API. It needs `youtubeApiKey` on the server and is disabled without one.
 *   **Recompute stacks** rebuilds stacked playlists from every description.
 *
 * It talks only to the `client` prop, a `VideoLibraryClient`. Point it at
 * your server with `createLibraryClient({ baseUrl, headers })`. The client
 * sends `headers` on every request, so that is where the admin token goes. In
 * these stories the client runs the real handler in-process over a memory
 * store, so every button works and edits last until reload.
 *
 * `customFields` is optional: without it the screen loads them from the
 * server's `GET /fields`.
 */
const meta = {
  title: 'Admin/VideoLibraryAdmin',
  component: VideoLibraryAdmin,
  args: { onChange: fn() },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VideoLibraryAdmin>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The demo library. Try search, sorting, the star, edit and delete. */
export const Default: Story = { args: { client: makeClient() } };

/** Custom fields passed as a prop, so the screen skips `GET /fields`. */
export const WithFieldsProp: Story = { args: { client: makeClient(), customFields: DEMO_FIELDS } };

/** Four rows a page, to show paging. */
export const SmallPages: Story = { args: { client: makeClient(), pageSize: 4 } };

/** No Resync or Recompute buttons, for editors who should only edit. */
export const WithoutMaintenance: Story = { args: { client: makeClient(), hideMaintenance: true } };

/** An empty library: the first thing a new install sees. */
export const Empty: Story = { args: { client: makeClient({ empty: true }) } };

/** A slow server, so the loading state is visible. */
export const SlowServer: Story = { args: { client: makeClient({ latencyMs: 1500 }) } };
