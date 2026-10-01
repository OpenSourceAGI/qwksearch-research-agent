/**
 * @fileoverview Entry point for `extract-youtube/library` — a video library
 * with an admin API: storage (in-memory or Cloudflare D1), a
 * framework-agnostic HTTP handler, a typed client, stacked playlists, grouping
 * for tree views, and YouTube Data API / oEmbed metadata.
 *
 * No Node built-ins and no React: this entry runs on Workers, in Node, Bun,
 * Deno and the browser (the client half). The React grid and admin components
 * that sit on top of it live in `extract-youtube/react`.
 */

export * from './types';
export {
  isVideoId,
  optionalText,
  optionalBoolean,
  optionalNumber,
  publishedMsForDate,
  normalizeTags,
  coerceCustomValue,
  mergeCustomFields,
  searchTextFor,
  buildLibraryUpdate,
  buildNewLibraryVideo,
  emptyLibraryVideo,
  normalizeLibraryVideo,
  isEditableField,
} from './fields';
export {
  LIBRARY_SORTS,
  clampLimit,
  parseLibraryQuery,
  libraryQueryToParams,
  matchesLibraryQuery,
  compareLibraryVideos,
  applyLibraryQuery,
} from './query';
export {
  MAX_LINKS_PER_DESCRIPTION,
  MAX_STACK_SIZE,
  extractLinkedVideoIds,
  buildVideoStacks,
  assignVideoStacks,
  stackKeyOf,
  collectStackKeys,
  buildVideoSlots,
} from './stacks';
export type { StackableVideo, VideoStack, VideoStackMap, VideoSlot } from './stacks';
export {
  UNGROUPED_LABEL,
  groupByYear,
  groupByChannel,
  groupByCategory,
  groupByCustomField,
  BUILT_IN_GROUPERS,
  resolveGroupers,
  compareTreeNodes,
  buildVideoTree,
  videoTreeDepth,
  sortVideoTreeLeaves,
  countVideoTreeLeaves,
  groupKeysFromDepth,
} from './tree';
export type { GroupStep, VideoGrouper, VideoTreeLeaf, VideoTreeGroup, VideoTreeNode, BuiltInGrouping } from './tree';
export type { VideoLibraryStore, LibraryRowUpdate } from './store';
export { createMemoryLibraryStore } from './stores/memory';
export type { MemoryLibraryStoreOptions } from './stores/memory';
export { createD1LibraryStore, librarySchemaSql, rowToLibraryVideo } from './stores/d1';
export type { D1DatabaseLike, D1StatementLike, D1LibraryStore, D1LibraryStoreOptions } from './stores/d1';
export {
  YOUTUBE_API_BATCH_SIZE,
  YouTubeDataApiError,
  fetchYouTubeMetadata,
  classifyAvailability,
  fetchYouTubeOEmbed,
} from './youtube-data';
export type { YouTubeVideoMetadata, YouTubeFetchOptions, YouTubeMetadataReport, YouTubeOEmbed } from './youtube-data';
export {
  recomputeStacks,
  createLibraryVideo,
  updateLibraryVideo,
  deleteLibraryVideo,
  importLibraryVideos,
  resyncLibrary,
  resyncQuotaCost,
  autofillVideo,
} from './library';
export type {
  LibraryOperationOptions,
  ImportResult,
  ResyncResult,
  AutofillInput,
  AutofillContext,
  AutofillSuggest,
  AutofillResult,
} from './library';
export { createVideoLibraryHandler, bearerTokenAuth, json } from './handler';
export type { LibraryAuthorize, VideoLibraryHandlerOptions, VideoLibraryHandler } from './handler';
export { createLibraryClient, createLocalLibraryClient, LibraryApiError } from './client';
export type { VideoLibraryClient, LibraryClientOptions } from './client';
