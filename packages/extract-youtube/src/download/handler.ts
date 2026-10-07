/**
 * @fileoverview The media extractor as an HTTP API, so it can run as its own
 * cloud service — a Node container, a Vercel/Lambda Node function, a VPS —
 * and be called by apps that cannot run `cloud-ytdl` themselves, such as a
 * Cloudflare Worker (no sockets, no ffmpeg).
 *
 * `createMediaHandler` is a plain `(Request) => Promise<Response>`, so it
 * mounts in any fetch-style framework; `serveMediaApi` wraps it in `node:http`.
 * Routes match on the last path segment, so the API can sit under any prefix
 * (`/api/youtube/audio`, `/audio`, ...):
 *
 * | Route | Query | Answers |
 * | --- | --- | --- |
 * | `GET …/info` | `v` | `MediaInfo` JSON |
 * | `GET …/audio` | `v`, `format` (`mp3`/`m4a`/`webm`), `bitrate`, `mono`, `rate` | the audio file |
 * | `GET …/video` | `v`, `quality` (`highest`/`highestvideo`/itag) | the video file |
 * | `GET …/subtitles` | `v`, `lang`, `format` (`srt`/`xml`) | the captions text |
 * | `GET …/playlist` | `url` | playlist JSON |
 * | `GET …/post` | `url` | community post JSON |
 *
 * Set `apiKey` before exposing it: an open download proxy is bandwidth anyone
 * can spend. Callers then send `Authorization: Bearer <key>` or `x-api-key`.
 */

import { Readable } from 'node:stream';
import {
  createMediaExtractor,
  MediaExtractionError,
  type AudioContainer,
  type MediaDownload,
  type MediaExtractor,
  type MediaExtractorOptions,
} from './media';

export interface MediaHandlerOptions extends MediaExtractorOptions {
  /** Shared secret callers must present. Unset leaves the API open — only for local use. */
  apiKey?: string;
  /** A prebuilt extractor; otherwise one is built from the other options. */
  extractor?: MediaExtractor;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Constant-time string comparison, so the key cannot be guessed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function presentedKey(request: Request): string {
  const auth = request.headers.get('authorization') ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1];
  return (bearer ?? request.headers.get('x-api-key') ?? '').trim();
}

function errorStatus(error: unknown): number {
  if (!(error instanceof MediaExtractionError)) return 502;
  return { invalid: 400, unavailable: 404, dependency: 501, failed: 502 }[error.code];
}

function streamResponse(download: MediaDownload): Response {
  const headers: Record<string, string> = {
    'content-type': download.mimeType,
    'content-disposition': `attachment; filename="${download.filename}"`,
    'cache-control': 'no-store',
    'x-video-id': download.info.videoId,
    'x-video-title': encodeURIComponent(download.info.title),
  };
  if (download.info.lengthSeconds != null) headers['x-video-duration'] = String(download.info.lengthSeconds);
  if (download.contentLength != null) headers['content-length'] = String(download.contentLength);
  const body = Readable.toWeb(download.stream) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, { status: 200, headers });
}

/** Builds the fetch-style media API handler. */
export function createMediaHandler(options: MediaHandlerOptions = {}) {
  const media = options.extractor ?? createMediaExtractor(options);

  return async function handleMediaRequest(request: Request): Promise<Response> {
    if (options.apiKey && !safeEqual(presentedKey(request), options.apiKey)) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    const q = url.searchParams;
    const videoId = q.get('v') ?? q.get('videoId') ?? q.get('id') ?? '';

    try {
      switch (route) {
        case 'info':
          return json(await media.getInfo(videoId));
        case 'audio': {
          const format = (q.get('format') ?? 'mp3') as AudioContainer;
          const bitrate = Number(q.get('bitrate'));
          const rate = Number(q.get('rate'));
          return streamResponse(
            await media.downloadAudio(videoId, {
              container: format,
              bitrateKbps: Number.isFinite(bitrate) && bitrate > 0 ? bitrate : undefined,
              mono: q.get('mono') === '1' || q.get('mono') === 'true',
              sampleRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
            }),
          );
        }
        case 'video': {
          const quality = q.get('quality') ?? 'highest';
          const itag = Number(quality);
          return streamResponse(
            await media.downloadVideo(videoId, {
              quality: Number.isInteger(itag) && itag > 0 ? itag : (quality as 'highest' | 'highestvideo'),
            }),
          );
        }
        case 'subtitles': {
          const format = q.get('format') === 'xml' ? 'xml' : 'srt';
          const text = await media.getSubtitles(videoId, { lang: q.get('lang') ?? 'en', format });
          if (text == null) return json({ error: 'No subtitles in that language' }, 404);
          return new Response(text, {
            headers: { 'content-type': format === 'xml' ? 'application/xml' : 'application/x-subrip; charset=utf-8' },
          });
        }
        case 'playlist':
          return json(await media.getPlaylist(q.get('url') ?? q.get('list') ?? ''));
        case 'post':
          return json(await media.getPost(q.get('url') ?? ''));
        default:
          return json({ error: `Unknown route "${route}"`, routes: ['info', 'audio', 'video', 'subtitles', 'playlist', 'post'] }, 404);
      }
    } catch (error) {
      return json({ error: (error as Error)?.message ?? String(error) }, errorStatus(error));
    }
  };
}

/**
 * Serves the media API over `node:http`. Resolves with the listening server.
 *
 * @example
 * ```ts
 * import { serveMediaApi } from 'extract-youtube/download';
 * await serveMediaApi({ port: 8787, apiKey: process.env.MEDIA_API_KEY });
 * // GET http://localhost:8787/audio?v=dQw4w9WgXcQ&format=mp3
 * ```
 */
export async function serveMediaApi(options: MediaHandlerOptions & { port?: number; host?: string } = {}) {
  const { createServer } = await import('node:http');
  const handle = createMediaHandler(options);

  const server = createServer(async (req, res) => {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(', '));
      }
      const response = await handle(
        new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, { method: req.method, headers }),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (!response.body || req.method === 'HEAD') return void res.end();
      const body = Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream);
      body.on('error', () => res.destroy());
      res.on('close', () => body.destroy());
      body.pipe(res);
    } catch (error) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error)?.message ?? 'Internal error' }));
    }
  });

  await new Promise<void>((resolve) => server.listen(options.port ?? 8787, options.host, resolve));
  return server;
}
