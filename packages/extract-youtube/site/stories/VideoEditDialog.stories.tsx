import type { Meta, StoryObj } from '@storybook/react-vite';
import { VideoEditDialog } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { DEMO_FIELDS, byId, makeClient } from './fixtures';

/**
 * The add/edit form for one library video, as a modal dialog.
 *
 * - **Add** (`video={null}`): paste a YouTube URL or an 11-character id. The
 *   id is pulled out of any URL shape (watch, youtu.be, embed, shorts, live).
 * - **Edit**: the id is fixed. Only the fields you change are sent, so an
 *   edit never overwrites a field someone else changed meanwhile. Saving
 *   marks the row `adminEdited`, so later imports leave it alone.
 * - **Auto-fill** calls `POST /autofill`, which reads the YouTube Data API
 *   (or oEmbed without a key) and then your `suggest` hook on the server.
 *   Anything you already typed wins over what it finds.
 * - **Custom fields** render one input each, by type: text, textarea,
 *   number, a checkbox for boolean, a URL box that accepts http(s) only, and
 *   a select for `options`.
 *
 * `categories` feeds the category box's suggestions.
 */
const meta = {
  title: 'Admin/VideoEditDialog',
  component: VideoEditDialog,
  args: {
    client: makeClient(),
    customFields: DEMO_FIELDS,
    categories: ['History', 'Machine learning', 'Music', 'Programming', 'Talks'],
    onClose: fn(),
    onSaved: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof VideoEditDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Adding a video. Paste `https://youtu.be/9bZkp7q19f0` and press Auto-fill. */
export const AddVideo: Story = { args: { video: null } };

/** Editing a video with every custom field filled in. */
export const EditVideo: Story = { args: { video: byId('aircAruvnKk') } };

/** Editing a video YouTube reports as removed. */
export const EditUnavailable: Story = { args: { video: byId('zzzzzzzzzz0') } };

/** No custom fields declared: only the built-in fields show. */
export const NoCustomFields: Story = { args: { video: byId('UF8uR6Z6KLc'), customFields: [] } };
