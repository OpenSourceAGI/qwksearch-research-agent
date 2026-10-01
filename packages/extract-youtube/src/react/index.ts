/**
 * @fileoverview Entry point for `extract-youtube/react` — the UI half of the
 * package: a popout transcript modal and a floating, persistent YouTube
 * player. Kept separate from the main entry so consumers who only want the
 * transcript-fetching API never pull in React, and vice versa.
 */

export { YouTubeTranscriptModal } from './YouTubeTranscriptModal';
export type { YouTubeTranscriptModalProps } from './YouTubeTranscriptModal';

export { FloatingYouTubePlayer } from './player/FloatingYouTubePlayer';
export type {
  FloatingYouTubePlayerProps,
  PlayerControlContext,
} from './player/FloatingYouTubePlayer';

export {
  youtubePlayer,
  usePlayerState,
  getPlayerState,
  sendPlayerCommand,
} from './player/playerStore';
export type { PlayerVideo, PlayerState, PlayOptions } from './player/playerStore';

export {
  buildEmbedUrl,
  watchUrl,
  thumbnailUrl,
  describePlayerError,
} from './player/youtubeEmbed';

export { loadTranscript, useTranscript, formatTime } from './transcript';
export type { TranscriptSnippet, TranscriptSource, TranscriptResponse } from './transcript';

export { groupIntoSentences } from './sentences';

export { usePlayerSelector } from './player/playerStore';

// ── Video grid, list and library admin ─────────────────────────────────────
// Ported from debate-ai.com's debate-videos package; see `library/` for the
// data layer these render (`extract-youtube/library`).
export { VideoCard, HideConfirm } from './grid/VideoCard';
export type { VideoCardProps, VideoActionProps } from './grid/VideoCard';
export { StackedVideoCard } from './grid/StackedVideoCard';
export type { StackedVideoCardProps } from './grid/StackedVideoCard';
export { StackNav, defaultStackLabel } from './grid/StackNav';
export type { StackNavProps } from './grid/StackNav';
export { VideoGrid } from './grid/VideoGrid';
export type { VideoGridProps } from './grid/VideoGrid';
export { VideoList } from './grid/VideoList';
export type { VideoListProps, VideoListColumn, SortDirection } from './grid/VideoList';
export { useResizableColumns, ColumnResizeHandle } from './grid/useResizableColumns';
export { useVideoLibrary } from './grid/useVideoLibrary';
export type { UseVideoLibraryResult } from './grid/useVideoLibrary';
export { GridStylesProvider, GRID_STYLES } from './grid/styles';
export { formatViewCount, formatVideoDate, formatCustomValue, formatCustomCell, toPlayerVideo, thumbnailFor } from './grid/format';

export { VideoLibraryAdmin } from './admin/VideoLibraryAdmin';
export type { VideoLibraryAdminProps } from './admin/VideoLibraryAdmin';
export { VideoEditDialog, CustomFieldInput } from './admin/VideoEditDialog';
export type { VideoEditDialogProps } from './admin/VideoEditDialog';
export { VideoAvailabilityPanel } from './admin/VideoAvailabilityPanel';
export type { VideoAvailabilityPanelProps } from './admin/VideoAvailabilityPanel';

// Grouping helpers, re-exported so a `<VideoList groupBy={…}>` caller needs one import.
export { groupByYear, groupByChannel, groupByCategory, groupByCustomField } from '../library/tree';
export type { VideoGrouper, BuiltInGrouping } from '../library/tree';
export type { VideoItem, LibraryVideo, CustomFieldDef } from '../library/types';
