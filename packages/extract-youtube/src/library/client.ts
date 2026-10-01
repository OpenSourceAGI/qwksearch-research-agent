/**
 * @fileoverview A typed client for the library API, and a local stand-in with
 * the same interface.
 *
 * The React admin components never call `fetch` themselves; they take a
 * {@link VideoLibraryClient}. In an app that is {@link createLibraryClient}
 * pointed at wherever `createVideoLibraryHandler` is mounted. In Storybook, a
 * test or an offline demo it is {@link createLocalLibraryClient}, which runs
 * the very same handler in-process against a store — so the stories exercise
 * the real routes, validation and all, with no server.
 */

import { createVideoLibraryHandler, type VideoLibraryHandlerOptions } from './handler';
import type { AutofillResult, ImportResult, ResyncResult } from './library';
import { libraryQueryToParams } from './query';
import type { CustomFieldDef, LibraryExclusion, LibraryPage, LibraryQuery, LibraryVideo, LibraryVideoPatch } from './types';

export interface VideoLibraryClient {
  list(query?: LibraryQuery): Promise<LibraryPage>;
  get(videoId: string): Promise<LibraryVideo>;
  stacks(keys: readonly string[]): Promise<Record<string, LibraryVideo[]>>;
  categories(): Promise<string[]>;
  fields(): Promise<CustomFieldDef[]>;
  session(): Promise<{ admin: boolean }>;
  create(videoId: string, patch: LibraryVideoPatch): Promise<LibraryVideo>;
  update(videoId: string, patch: LibraryVideoPatch): Promise<LibraryVideo>;
  remove(videoId: string): Promise<void>;
  autofill(input: { videoId: string; title?: string; channel?: string; description?: string }): Promise<AutofillResult>;
  resyncStatus(): Promise<{ videos: number; quotaCost: number; configured: boolean }>;
  resync(): Promise<ResyncResult>;
  unavailable(limit?: number): Promise<LibraryVideo[]>;
  markAvailable(videoId: string): Promise<LibraryVideo>;
  importVideos(videos: ReadonlyArray<Partial<LibraryVideo> & { videoId: string }>, options?: { overwriteEdited?: boolean }): Promise<ImportResult>;
  recomputeStacks(): Promise<{ moved: number }>;
  exclusions(): Promise<LibraryExclusion[]>;
  removeExclusion(videoId: string): Promise<void>;
}

/** Thrown for any non-2xx answer; `status` is the HTTP status, `message` the API's `error`. */
export class LibraryApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'LibraryApiError';
  }
}

export interface LibraryClientOptions {
  /** Where the handler is mounted, e.g. `/api/library` or `https://host/api/library`. */
  baseUrl: string;
  /** Extra headers per request — an `Authorization` header, a CSRF token. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  /** Custom fetch. Defaults to the global. */
  fetch?: typeof fetch;
}

/** A client over HTTP. */
export function createLibraryClient(options: LibraryClientOptions): VideoLibraryClient {
  const base = options.baseUrl.replace(/\/+$/, '');
  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const extra = typeof options.headers === 'function' ? await options.headers() : options.headers;
    const headers = new Headers(extra);
    if (body !== undefined) headers.set('content-type', 'application/json');
    const response = await doFetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Empty or non-JSON body; the status says what happened.
    }
    if (!response.ok) {
      const message = (payload as { error?: string } | null)?.error ?? `Request failed with ${response.status}`;
      throw new LibraryApiError(message, response.status);
    }
    return payload as T;
  }

  const id = (videoId: string) => encodeURIComponent(videoId);

  return {
    list: (query = {}) => {
      const params = libraryQueryToParams(query).toString();
      return call<LibraryPage>('GET', `/videos${params ? `?${params}` : ''}`);
    },
    get: async (videoId) => (await call<{ video: LibraryVideo }>('GET', `/videos/${id(videoId)}`)).video,
    stacks: async (keys) =>
      keys.length === 0
        ? {}
        : (await call<{ stacks: Record<string, LibraryVideo[]> }>('GET', `/stacks?keys=${keys.map(encodeURIComponent).join(',')}`)).stacks,
    categories: async () => (await call<{ categories: string[] }>('GET', '/categories')).categories,
    fields: async () => (await call<{ fields: CustomFieldDef[] }>('GET', '/fields')).fields,
    session: () => call<{ admin: boolean }>('GET', '/session'),
    create: async (videoId, patch) => (await call<{ video: LibraryVideo }>('POST', '/videos', { ...patch, videoId })).video,
    update: async (videoId, patch) => (await call<{ video: LibraryVideo }>('PATCH', `/videos/${id(videoId)}`, patch)).video,
    remove: async (videoId) => {
      await call('DELETE', `/videos/${id(videoId)}`);
    },
    autofill: (input) => call<AutofillResult>('POST', '/autofill', input),
    resyncStatus: () => call('GET', '/resync'),
    resync: () => call<ResyncResult>('POST', '/resync'),
    unavailable: async (limit) =>
      (await call<{ videos: LibraryVideo[] }>('GET', `/availability${limit ? `?limit=${limit}` : ''}`)).videos,
    markAvailable: async (videoId) => (await call<{ video: LibraryVideo }>('POST', '/availability', { videoId })).video,
    importVideos: (videos, importOptions = {}) =>
      call<ImportResult>('POST', '/import', { videos, overwriteEdited: importOptions.overwriteEdited ?? false }),
    recomputeStacks: () => call<{ moved: number }>('POST', '/stacks/recompute'),
    exclusions: async () => (await call<{ exclusions: LibraryExclusion[] }>('GET', '/exclusions')).exclusions,
    removeExclusion: async (videoId) => {
      await call('DELETE', `/exclusions/${id(videoId)}`);
    },
  };
}

/**
 * A client that runs `createVideoLibraryHandler` in-process — no server, same
 * routes, same validation. `authorize` defaults to allowing everything, since
 * there is no one else on the other end.
 *
 * @param latencyMs - Artificial delay per call, so loading states are visible in stories.
 */
export function createLocalLibraryClient(
  options: Omit<VideoLibraryHandlerOptions, 'basePath'> & { latencyMs?: number },
): VideoLibraryClient {
  const basePath = '/api/library';
  const handler = createVideoLibraryHandler({ authorize: () => true, ...options, basePath });
  return createLibraryClient({
    baseUrl: `http://local${basePath}`,
    fetch: async (input, init) => {
      if (options.latencyMs) await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
      return handler.fetch(new Request(input as string, init));
    },
  });
}
