/**
 * `extract-youtube/download` — offline: cloud-ytdl is a fake and ffmpeg a stub,
 * so these pin the format picking, the MP3 pipe and the HTTP routes without
 * touching YouTube.
 */

import { EventEmitter } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import {
  createMediaExtractor,
  createMediaHandler,
  MediaExtractionError,
  pickAudioFormat,
  safeFilename,
  type CloudYtdl,
  type CloudYtdlFormat,
  type CloudYtdlInfo,
  type SpawnFn,
} from '../src/download';

const FORMATS: CloudYtdlFormat[] = [
  { itag: 18, url: 'u18', container: 'mp4', hasAudio: true, hasVideo: true, qualityLabel: '360p', audioBitrate: 96 },
  { itag: 137, url: 'u137', container: 'mp4', hasAudio: false, hasVideo: true, qualityLabel: '1080p', bitrate: 4_000_000 },
  { itag: 136, url: 'u136', container: 'mp4', hasAudio: false, hasVideo: true, qualityLabel: '720p', bitrate: 2_000_000 },
  { itag: 140, url: 'u140', container: 'mp4', mimeType: 'audio/mp4; codecs="mp4a.40.2"', hasAudio: true, hasVideo: false, audioBitrate: 128, contentLength: '3400000' },
  { itag: 251, url: 'u251', container: 'webm', mimeType: 'audio/webm; codecs="opus"', hasAudio: true, hasVideo: false, audioBitrate: 160 },
  { itag: 233, url: 'u233', container: 'ts', hasAudio: true, hasVideo: false, audioBitrate: 256, isHLS: true },
];

const INFO: CloudYtdlInfo = {
  videoDetails: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Round 3: Aff vs. Neg / Finals!',
    author: { name: 'Debate Channel' },
    lengthSeconds: '212',
    thumbnails: [{ url: 'small.jpg', width: 120 }, { url: 'big.jpg', width: 1280 }],
  },
  formats: FORMATS,
  player_response: {
    captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: 'en' }, { languageCode: 'en' }, { languageCode: 'es' }] } },
  },
};

function fakeYtdl(overrides: Partial<CloudYtdl> = {}) {
  const downloads: CloudYtdlFormat[] = [];
  const ytdl: CloudYtdl = {
    getInfo: jest.fn(async () => INFO),
    downloadFromInfo: jest.fn((_info, opts) => {
      downloads.push((opts as { format: CloudYtdlFormat }).format);
      return Readable.from([Buffer.from('AUDIO-BYTES')]);
    }),
    getSubtitles: jest.fn(async (_id, { lang } = {}) => (lang === 'en' ? '1\n00:00:00,000 --> 00:00:01,000\nHi\n' : null)),
    getPlaylistInfo: jest.fn(async () => ({ id: 'PL1', items: [] })),
    getPostInfo: jest.fn(async () => ({ content: 'post' })),
    getVideoID: jest.fn((s: string) => {
      const m = /v=([\w-]{11})/.exec(s);
      if (!m) throw new Error('No video id found');
      return m[1];
    }),
    ...overrides,
  };
  return { ytdl, downloads };
}

/** An ffmpeg stand-in that upper-cases its input, or fails to start. */
function fakeSpawn(behaviour: 'ok' | 'missing' = 'ok') {
  const calls: string[][] = [];
  const spawn: SpawnFn = (_cmd, args) => {
    calls.push(args);
    const child = new EventEmitter() as EventEmitter & ReturnType<SpawnFn>;
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    Object.assign(child, { stdin, stdout, stderr: new PassThrough(), kill: () => true });
    if (behaviour === 'missing') {
      setImmediate(() => child.emit('error', Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' })));
    } else {
      stdin.on('data', (c: Buffer) => stdout.write(Buffer.from(c.toString().toUpperCase())));
      stdin.on('end', () => {
        stdout.end();
        setImmediate(() => child.emit('close', 0));
      });
    }
    return child;
  };
  return { spawn, calls };
}

async function readAll(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}

describe('pickAudioFormat', () => {
  it('picks the best direct audio-only stream for mp3, skipping HLS', () => {
    expect(pickAudioFormat(FORMATS, 'mp3')?.itag).toBe(251);
  });

  it('honours the requested container', () => {
    expect(pickAudioFormat(FORMATS, 'm4a')?.itag).toBe(140);
    expect(pickAudioFormat(FORMATS, 'webm')?.itag).toBe(251);
  });

  it('falls back to a progressive stream when there is no audio-only one', () => {
    expect(pickAudioFormat(FORMATS.filter((f) => f.hasVideo), 'mp3')?.itag).toBe(18);
    expect(pickAudioFormat(FORMATS.filter((f) => f.hasVideo), 'm4a')).toBeNull();
  });
});

describe('safeFilename', () => {
  it('strips characters filesystems reject', () => {
    expect(safeFilename('Round 3: Aff vs. Neg / Finals!', 'mp3')).toBe('Round-3-Aff-vs.-Neg-Finals.mp3');
    expect(safeFilename('???', 'm4a')).toBe('youtube-media.m4a');
  });
});

describe('createMediaExtractor', () => {
  it('summarizes info: sorted formats, unique caption languages, largest thumbnail', async () => {
    const { ytdl } = fakeYtdl();
    const info = await createMediaExtractor({ ytdl }).getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(info).toMatchObject({
      videoId: 'dQw4w9WgXcQ',
      author: 'Debate Channel',
      lengthSeconds: 212,
      thumbnail: 'big.jpg',
      captionLanguages: ['en', 'es'],
    });
    expect(info.audioFormats.map((f) => f.itag)).toEqual([233, 251, 140]);
    expect(info.videoFormats.map((f) => f.itag)).toEqual([137, 136]);
    expect(info.progressiveFormats.map((f) => f.itag)).toEqual([18]);
  });

  it('streams native m4a untouched', async () => {
    const { ytdl, downloads } = fakeYtdl();
    const result = await createMediaExtractor({ ytdl }).downloadAudio('dQw4w9WgXcQ', { container: 'm4a' });
    expect(downloads[0].itag).toBe(140);
    expect(result).toMatchObject({ mimeType: 'audio/mp4', contentLength: 3_400_000, filename: 'Round-3-Aff-vs.-Neg-Finals.m4a' });
    expect(await readAll(result.stream)).toBe('AUDIO-BYTES');
  });

  it('transcodes to mp3 through ffmpeg with the speech settings', async () => {
    const { ytdl } = fakeYtdl();
    const { spawn, calls } = fakeSpawn();
    const result = await createMediaExtractor({ ytdl, spawn }).downloadAudio('dQw4w9WgXcQ', {
      bitrateKbps: 48,
      mono: true,
      sampleRate: 16000,
    });
    expect(result.mimeType).toBe('audio/mpeg');
    expect(result.contentLength).toBeNull();
    expect(await readAll(result.stream)).toBe('AUDIO-BYTES');
    expect(calls[0]).toEqual(expect.arrayContaining(['-ac', '1', '-ar', '16000', '-b:a', '48k', '-f', 'mp3']));
  });

  it('fails the mp3 stream with a named error when ffmpeg is missing', async () => {
    const { ytdl } = fakeYtdl();
    const { spawn } = fakeSpawn('missing');
    const result = await createMediaExtractor({ ytdl, spawn }).downloadAudio('dQw4w9WgXcQ');
    await expect(readAll(result.stream)).rejects.toThrow(/ffmpeg was not found/);
  });

  it('rejects ids that are neither an id nor a video URL', async () => {
    const { ytdl } = fakeYtdl();
    await expect(createMediaExtractor({ ytdl }).getInfo('not a video')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('reports an unreadable video as unavailable', async () => {
    const { ytdl } = fakeYtdl({ getInfo: jest.fn(async () => { throw new Error('Video unavailable'); }) });
    await expect(createMediaExtractor({ ytdl }).getInfo('dQw4w9WgXcQ')).rejects.toBeInstanceOf(MediaExtractionError);
  });

  it('downloads the best progressive or video-only stream', async () => {
    const { ytdl, downloads } = fakeYtdl();
    const media = createMediaExtractor({ ytdl });
    await media.downloadVideo('dQw4w9WgXcQ');
    await media.downloadVideo('dQw4w9WgXcQ', { quality: 'highestvideo' });
    await media.downloadVideo('dQw4w9WgXcQ', { quality: 136 });
    expect(downloads.map((f) => f.itag)).toEqual([18, 137, 136]);
  });

  it('builds a cookie agent once and passes it to every request', async () => {
    const createAgent = jest.fn(() => ({ agent: 'jar' }));
    const { ytdl } = fakeYtdl({ createAgent });
    const media = createMediaExtractor({ ytdl, cookies: 'SID=secret' });
    await media.getInfo('dQw4w9WgXcQ');
    await media.getInfo('dQw4w9WgXcQ');
    expect(createAgent).toHaveBeenCalledTimes(1);
    expect(ytdl.getInfo).toHaveBeenLastCalledWith(expect.any(String), { agent: { agent: 'jar' } });
  });
});

describe('createMediaHandler', () => {
  const handlerWith = (apiKey?: string) => {
    const { ytdl } = fakeYtdl();
    return createMediaHandler({ ytdl, apiKey, spawn: fakeSpawn().spawn });
  };

  it('requires the api key when one is set', async () => {
    const handle = handlerWith('k3y');
    expect((await handle(new Request('http://x/api/youtube/info?v=dQw4w9WgXcQ'))).status).toBe(401);
    const ok = await handle(new Request('http://x/api/youtube/info?v=dQw4w9WgXcQ', { headers: { authorization: 'Bearer k3y' } }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).title).toBe('Round 3: Aff vs. Neg / Finals!');
  });

  it('serves audio as an attachment with the video headers', async () => {
    const res = await handlerWith()(new Request('http://x/audio?v=dQw4w9WgXcQ&format=mp3&bitrate=48&mono=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    expect(res.headers.get('content-disposition')).toContain('.mp3');
    expect(res.headers.get('x-video-duration')).toBe('212');
    expect(await res.text()).toBe('AUDIO-BYTES');
  });

  it('serves subtitles, and 404s a missing language', async () => {
    const handle = handlerWith();
    const srt = await handle(new Request('http://x/subtitles?v=dQw4w9WgXcQ&lang=en'));
    expect(await srt.text()).toContain('Hi');
    expect((await handle(new Request('http://x/subtitles?v=dQw4w9WgXcQ&lang=fr'))).status).toBe(404);
  });

  it('maps errors to statuses and unknown routes to 404', async () => {
    const handle = handlerWith();
    expect((await handle(new Request('http://x/info?v=nope'))).status).toBe(400);
    expect((await handle(new Request('http://x/unknown'))).status).toBe(404);
    expect((await handle(new Request('http://x/info', { method: 'POST' }))).status).toBe(405);
  });
});
