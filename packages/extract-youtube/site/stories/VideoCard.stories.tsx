import type { Meta, StoryObj } from '@storybook/react-vite';
import { VideoCard } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { DEMO_FIELDS, byId } from './fixtures';

/**
 * One video as a card: thumbnail, title, channel, date and views, badges for
 * the category and any custom field marked `showOnCard`, and an action row.
 *
 * Every action is opt-in by callback. Pass `onToggleFavorite` and a star
 * appears; leave it out and it does not. Play, queue and "open on YouTube"
 * are on by default. Play and queue drive the mounted
 * `<FloatingYouTubePlayer />` through `youtubePlayer`, and the card reads
 * player state to show a "Playing" or "Queued" marker. `onPlay` replaces the
 * play action outright.
 *
 * The only required field on `video` is `videoId`. Everything else is shown
 * when present, so a bare `{ videoId }` renders a usable card.
 */
const meta = {
  title: 'Grid/VideoCard',
  component: VideoCard,
  args: {
    video: byId('UF8uR6Z6KLc'),
    customFields: DEMO_FIELDS,
    onToggleFavorite: fn(),
    onHide: fn(),
    onUnhide: fn(),
    onBadgeClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VideoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A library video with custom-field badges (`speaker`, `level`) and every action. */
export const Default: Story = {};

/** Starred: `favorites` holds its id, so the star is filled and pressed. */
export const Favorite: Story = { args: { favorites: ['UF8uR6Z6KLc'] } };

/** `featured: true` adds the "Top pick" badge. */
export const TopPick: Story = { args: { video: byId('jNQXAC9IVRw') } };

/** Hidden: dimmed, flagged, and the hide action becomes "Unhide". */
export const Hidden: Story = { args: { hidden: ['UF8uR6Z6KLc'] } };

/** Watch progress from `getProgress`, drawn as a bar under the thumbnail. */
export const WithProgress: Story = { args: { getProgress: () => 0.42 } };

/** `showDescription` and `showFullDate`, for a roomier card. */
export const WithDescription: Story = { args: { video: byId('aircAruvnKk'), showDescription: true, showFullDate: true } };

/** No thumbnail: a compact text card, for dense layouts. */
export const NoThumbnail: Story = { args: { showThumbnail: false } };

/** The minimum input: only a `videoId`. The thumbnail comes from YouTube's image CDN. */
export const BareVideoId: Story = { args: { video: { videoId: 'M7lc1UVf-VE' }, customFields: [] } };

/** `renderActions` appends your own buttons to the action row. */
export const CustomActions: Story = {
  args: {
    renderActions: (video) => (
      <button type="button" className="eytg-icon-btn" onClick={() => navigator.clipboard?.writeText(`https://youtu.be/${video.videoId}`)}>
        Copy link
      </button>
    ),
  },
};

/** The captions button opens `<YouTubeTranscriptModal />` when a transcript source is given. */
export const WithTranscript: Story = { args: { transcriptUrl: '/api/transcript' } };
