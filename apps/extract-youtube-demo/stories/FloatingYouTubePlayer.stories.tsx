import type { Meta, StoryObj } from '@storybook/react-vite';
import { FloatingYouTubePlayer, youtubePlayer } from 'extract-youtube/react';
import { useEffect } from 'react';

import { SAMPLE_SNIPPETS } from '../src/demo-data';
import { SpeedButton } from '../src/SpeedButton';

/**
 * A floating YouTube player that stays on screen while the page underneath
 * changes. Mount it once at the root of your app and drive it from anywhere
 * with `youtubePlayer.play({ videoId })`.
 *
 * - Drag it by the title bar and resize it from any edge.
 * - Minimize it to its title bar (playback continues), or pop it out into an
 *   always-on-top Document Picture-in-Picture window.
 * - A queue (`youtubePlayer.addToQueue`, `setQueue`) plays next when a video
 *   ends.
 * - The captions button shows a synced, clickable transcript from
 *   `transcriptUrl` or `fetchTranscript`.
 * - With `storageKey` set, a reload resumes the same video at the same spot.
 * - `extraControls` adds your own buttons to the control strip and hands
 *   them the live player state. The Gauge button here is the demo's
 *   `SpeedButton`.
 *
 * The player is fixed to the viewport, so these stories open it bottom-right
 * of the canvas.
 */
const meta = {
  title: 'Player/FloatingYouTubePlayer',
  component: FloatingYouTubePlayer,
  parameters: { layout: 'fullscreen' },
  args: {
    storageKey: null,
    fetchTranscript: async () => ({ snippets: SAMPLE_SNIPPETS }),
  },
} satisfies Meta<typeof FloatingYouTubePlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Opened({ videoId, title, queue = [] }: { videoId: string; title: string; queue?: { videoId: string; title: string }[] }) {
  useEffect(() => {
    youtubePlayer.play({ videoId, title, meta: { channel: '3Blue1Brown' } });
    youtubePlayer.setQueue(queue);
    return () => {
      youtubePlayer.clearQueue();
      youtubePlayer.close();
    };
  }, [videoId, title, queue]);
  return <p style={{ padding: 16, color: 'var(--muted)' }}>The player opens in the bottom-right corner of this canvas.</p>;
}

/** Playing, with captions from `fetchTranscript` and the demo's speed button. */
export const Playing: Story = {
  args: {
    extraControls: ({ playbackRate, player }) => <SpeedButton playbackRate={playbackRate} player={player} />,
  },
  render: (args) => (
    <>
      <Opened videoId="aircAruvnKk" title="But what is a neural network?" />
      <FloatingYouTubePlayer {...args} />
    </>
  ),
};

const QUEUE = [
  { videoId: 'IHZwWFHWa-w', title: 'Gradient descent, how neural networks learn' },
  { videoId: 'M7lc1UVf-VE', title: 'Embedded Web Player Customization' },
];

/** With two videos queued behind the current one. Open the queue from the control strip. */
export const WithQueue: Story = {
  render: (args) => (
    <>
      <Opened videoId="aircAruvnKk" title="But what is a neural network?" queue={QUEUE} />
      <FloatingYouTubePlayer {...args} />
    </>
  ),
};

/** `renderTitle` replaces the title bar content. */
export const CustomTitle: Story = {
  args: { renderTitle: ({ video }) => <strong>{`Now playing: ${video.title ?? video.videoId}`}</strong> },
  render: (args) => (
    <>
      <Opened videoId="aircAruvnKk" title="But what is a neural network?" />
      <FloatingYouTubePlayer {...args} />
    </>
  ),
};

/** Opened from buttons, the way an app drives it. */
export const DrivenByButtons: Story = {
  render: (args) => (
    <div style={{ padding: 16, display: 'flex', gap: 8 }}>
      <button type="button" onClick={() => youtubePlayer.play({ videoId: 'aircAruvnKk', title: 'Neural networks' })}>
        Play neural networks
      </button>
      <button type="button" onClick={() => youtubePlayer.addToQueue({ videoId: 'IHZwWFHWa-w', title: 'Gradient descent' })}>
        Queue gradient descent
      </button>
      <button type="button" onClick={() => youtubePlayer.close()}>
        Close
      </button>
      <FloatingYouTubePlayer {...args} />
    </div>
  ),
};
