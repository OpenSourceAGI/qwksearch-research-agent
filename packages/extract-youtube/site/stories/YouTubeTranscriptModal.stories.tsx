import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouTubeTranscriptModal } from 'extract-youtube/react';
import { fn } from 'storybook/test';

import { SAMPLE_SNIPPETS } from '../components/demo/demo-data';

/**
 * A video next to its full transcript, in a modal. The line being spoken
 * highlights and scrolls into view, and clicking any line seeks the video
 * there.
 *
 * Captions come from one of three places, first match wins:
 * 1. `snippets`, already loaded (say, server-side);
 * 2. `fetchTranscript(videoId)`, your own loader;
 * 3. `transcriptUrl`, your endpoint returning `{ snippets }` or `{ error }`.
 *    The live demo's Worker serves one at `/api/transcript`, built on this
 *    package's `YouTubeTranscriptApi`.
 *
 * Browsers cannot fetch YouTube captions themselves (CORS), so there is always
 * a server in the loop. The component never talks to YouTube for captions.
 *
 * The default trigger is a small captions button. Pass `trigger` for your own.
 */
const meta = {
  title: 'Player/YouTubeTranscriptModal',
  component: YouTubeTranscriptModal,
  args: { videoId: 'aircAruvnKk', title: 'But what is a neural network?', onOpenChange: fn() },
} satisfies Meta<typeof YouTubeTranscriptModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Captions passed in directly. Click the captions button. */
export const WithSnippets: Story = { args: { snippets: SAMPLE_SNIPPETS } };

/** Captions from a loader, with a delay so the loading state shows. */
export const WithLoader: Story = {
  args: {
    fetchTranscript: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return { snippets: SAMPLE_SNIPPETS };
    },
  },
};

/** A video with no captions: the loader answers `{ error }`. */
export const NoCaptions: Story = {
  args: { fetchTranscript: async () => ({ snippets: [], error: 'Subtitles are disabled for this video' }) },
};

/** A custom trigger. */
export const CustomTrigger: Story = {
  args: {
    snippets: SAMPLE_SNIPPETS,
    trigger: (
      <button type="button" style={{ padding: '8px 14px' }}>
        Read the transcript
      </button>
    ),
  },
};

/** From the live demo's `/api/transcript`. Works when this Storybook is served by the demo Worker. */
export const FromEndpoint: Story = { args: { transcriptUrl: '/api/transcript' } };
