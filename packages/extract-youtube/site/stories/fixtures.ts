/**
 * Data every story shares: the demo library as normalized rows with their
 * stacks already assigned, and a factory for an in-process library client.
 *
 * `createLocalLibraryClient` runs the real `createVideoLibraryHandler` routes
 * against a memory store, so the admin stories exercise the same validation,
 * status codes and stack recomputation the Worker does, with no network.
 */
import {
  assignVideoStacks,
  createLocalLibraryClient,
  createMemoryLibraryStore,
  normalizeLibraryVideo,
  type LibraryVideo,
  type VideoLibraryClient,
  type VideoStackMap,
} from 'extract-youtube/library';

import { DEMO_FIELDS, DEMO_VIDEOS } from '../components/demo/demo-data';

const NOW = new Date('2026-09-01T12:00:00Z');

function withStacks(rows: LibraryVideo[]): LibraryVideo[] {
  const placement = assignVideoStacks(rows);
  return rows.map((row) => ({ ...row, ...placement.get(row.videoId) }));
}

/** The demo library, normalized and stacked, as the API would return it. */
export const LIBRARY: LibraryVideo[] = withStacks(DEMO_VIDEOS.map((seed) => normalizeLibraryVideo(seed, DEMO_FIELDS, NOW)));

/** Available videos only, which is what a public listing shows. */
export const AVAILABLE = LIBRARY.filter((video) => video.availability === 'available');

/** Every stack in the library, keyed by stack key: the shape `stacks` props take. */
export const STACKS: VideoStackMap<LibraryVideo> = LIBRARY.reduce<VideoStackMap<LibraryVideo>>((map, video) => {
  if (!video.stackKey) return map;
  (map[video.stackKey] ??= []).push(video);
  map[video.stackKey].sort((a, b) => a.stackPosition - b.stackPosition);
  return map;
}, {});

export const byId = (videoId: string): LibraryVideo => {
  const video = LIBRARY.find((row) => row.videoId === videoId);
  if (!video) throw new Error(`No demo video ${videoId}`);
  return video;
};

/** The two stacked 3Blue1Brown chapters, oldest first. */
export const STACK = STACKS[byId('aircAruvnKk').stackKey ?? ''] ?? [];

/**
 * A fresh library client per story: each story gets its own store, so an edit
 * in one never leaks into another. `latencyMs` makes loading states visible.
 */
export function makeClient(options: { empty?: boolean; latencyMs?: number } = {}): VideoLibraryClient {
  return createLocalLibraryClient({
    store: createMemoryLibraryStore({ seed: options.empty ? [] : LIBRARY, customFields: DEMO_FIELDS }),
    customFields: DEMO_FIELDS,
    latencyMs: options.latencyMs ?? 150,
  });
}

export { DEMO_FIELDS };
