/**
 * @fileoverview Entry point for `extract-youtube/react` — the popout
 * transcript modal UI, kept separate from the main entry so consumers who
 * only want the transcript-fetching API never pull in React.
 */

export { YouTubeTranscriptModal } from './YouTubeTranscriptModal';
export type { YouTubeTranscriptModalProps, TranscriptSnippet } from './YouTubeTranscriptModal';
