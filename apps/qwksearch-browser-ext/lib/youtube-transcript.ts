/**
 * @fileoverview Reads a YouTube video's captions from inside a youtube.com
 * tab, for the synced transcript panel the content script draws beside the
 * player.
 *
 * It follows the same route as `packages/extract-youtube` — the watch page's
 * InnerTube key, the `ANDROID` player endpoint (whose caption URLs do not need
 * the web client's proof-of-origin token), then the timed-text XML — but with
 * no dependencies: the content script already runs on youtube.com, so every
 * request is same-origin, and `DOMParser` stands in for the XML and entity
 * libraries the package bundles for Node.
 *
 * The regrouping of caption cues into sentences is ported from debate-ai's
 * watch-page transcript (`debate-videos/components/transcript`), so the panel
 * reads the same way there and here.
 */

/** One timed caption cue (or, after grouping, one timed sentence). */
export interface TranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

/** One entry of the player response's `captionTracks`. */
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  /** `"asr"` for YouTube's auto-generated captions. */
  kind?: string;
  name?: { simpleText?: string; runs?: { text: string }[] };
}

/** The transcript the panel renders, with the track it came from. */
export interface LoadedTranscript {
  videoId: string;
  languageCode: string;
  generated: boolean;
  sentences: TranscriptSnippet[];
}

/** Thrown when a video has no captions to read; `message` is shown as-is. */
export class TranscriptUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptUnavailableError';
  }
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The 11-character video id of a YouTube watch, shorts, live or embed URL, or
 * `null` for any other page (the home feed, search, a channel).
 */
export function getYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = parsed.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
    else {
      const match = parsed.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/);
      id = match?.[1] ?? null;
    }
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** The InnerTube API key embedded in a youtube.com page, or `null`. */
export function extractInnertubeApiKey(html: string): string | null {
  return html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/)?.[1] ?? null;
}

/**
 * Picks the track to show: the first preferred language with human-made
 * captions, then its auto-generated track, then any human-made track, then
 * whatever is left.
 */
export function pickCaptionTrack(
  tracks: CaptionTrack[],
  preferredLanguages: readonly string[] = [],
): CaptionTrack | null {
  if (tracks.length === 0) return null;
  const base = (code: string) => code.toLowerCase().split('-')[0];
  for (const lang of preferredLanguages.map(base)) {
    const matches = tracks.filter((t) => base(t.languageCode) === lang);
    const manual = matches.find((t) => t.kind !== 'asr');
    if (manual) return manual;
    if (matches[0]) return matches[0];
  }
  return tracks.find((t) => t.kind !== 'asr') ?? tracks[0];
}

/** Collapses a caption's line breaks and whitespace runs to single spaces. */
function cleanCueText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parses YouTube's timed-text XML into cues. Handles both the classic format
 * (`<text start="1.2" dur="3.4">`, seconds) and `srv3`
 * (`<p t="1200" d="3400">`, milliseconds, words split into `<s>` children).
 * Entities are decoded and markup inside a cue is dropped.
 */
export function parseTimedTextXml(xml: string): TranscriptSnippet[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return [];

  const cues: TranscriptSnippet[] = [];
  for (const el of Array.from(doc.getElementsByTagName('text'))) {
    const text = cleanCueText(decodeEntities(el.textContent ?? ''));
    if (!text) continue;
    cues.push({
      text,
      start: parseFloat(el.getAttribute('start') ?? '0') || 0,
      duration: parseFloat(el.getAttribute('dur') ?? '0') || 0,
    });
  }
  if (cues.length > 0) return cues;

  for (const el of Array.from(doc.getElementsByTagName('p'))) {
    const text = cleanCueText(decodeEntities(el.textContent ?? ''));
    if (!text) continue;
    cues.push({
      text,
      start: (parseFloat(el.getAttribute('t') ?? '0') || 0) / 1000,
      duration: (parseFloat(el.getAttribute('d') ?? '0') || 0) / 1000,
    });
  }
  return cues;
}

/**
 * Timed-text escapes the cue text a second time (`&amp;#39;` arrives as
 * `&#39;` after XML parsing), so the entities left over are decoded here and
 * any markup they spelled out is stripped.
 */
function decodeEntities(text: string): string {
  if (!/[&<]/.test(text)) return text;
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${text}`, 'text/html');
  return (doc.body.textContent ?? '').replace(/<[^>]*>/g, '');
}

/** A word ending a sentence, allowing a trailing quote or bracket. */
const SENTENCE_END = /[.!?…]["')\]]*$/;

/**
 * Words that end in a period without ending a sentence: single-letter
 * initials, dotted initialisms ("U.S."), and the common title/abbreviation
 * set. Without this, "the U.S. and China" becomes two "sentences".
 */
const ABBREVIATION = /^(?:[A-Za-z]\.)+$|^(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|fig|approx|e\.g|i\.e)\.$/i;

/**
 * Auto-generated captions frequently carry no punctuation at all, which would
 * make the whole video one unreadable sentence. A run that never terminates
 * is broken at a word boundary once it reaches this many characters.
 */
const MAX_SENTENCE_CHARS = 220;

/**
 * Regroups caption cues into sentences. YouTube cuts cues for on-screen
 * display, mid-clause, so a column of raw cues reads as fragments.
 *
 * Each sentence keeps the `{ text, start, duration }` shape: `start` is when
 * its first word is spoken and `duration` runs to the end of its last word.
 */
export function groupIntoSentences(snippets: TranscriptSnippet[]): TranscriptSnippet[] {
  const sentences: TranscriptSnippet[] = [];

  let words: string[] = [];
  let chars = 0;
  let start = 0;
  let end = 0;

  const flush = () => {
    if (words.length === 0) return;
    sentences.push({ text: words.join(' '), start, duration: Math.max(0, end - start) });
    words = [];
    chars = 0;
  };

  for (const snippet of snippets) {
    const cueWords = snippet.text.split(/\s+/).filter(Boolean);
    if (cueWords.length === 0) continue;

    // Words don't carry their own timestamps, so spread the cue's duration
    // evenly across them — a sentence boundary falling mid-cue still gets a
    // start time close to when it is actually spoken.
    const perWord = snippet.duration > 0 ? snippet.duration / cueWords.length : 0;

    cueWords.forEach((word, index) => {
      if (words.length === 0) start = snippet.start + perWord * index;
      words.push(word);
      chars += word.length + 1;
      end = snippet.start + perWord * (index + 1);

      const endsSentence = SENTENCE_END.test(word) && !ABBREVIATION.test(word);
      if (endsSentence || chars >= MAX_SENTENCE_CHARS) flush();
    });
  }

  flush();
  return sentences;
}

/** Index of the line being spoken at `seconds`, or -1 before the first. */
export function activeIndexAt(lines: TranscriptSnippet[], seconds: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= seconds) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Formats seconds as `m:ss`, or `h:mm:ss` past an hour. */
export function formatTimecode(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/** Plain text of the transcript, one timestamped sentence per line. */
export function transcriptToText(lines: TranscriptSnippet[]): string {
  return lines.map((line) => `[${formatTimecode(line.start)}] ${line.text}`).join('\n');
}

const INNERTUBE_CONTEXT = { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } };

interface FetchTranscriptOptions {
  /** HTML to look for the InnerTube key in before fetching the watch page. */
  pageHtml?: string;
  preferredLanguages?: readonly string[];
  fetchFn?: typeof fetch;
}

/**
 * Fetches and sentence-groups `videoId`'s captions. Must run on a
 * youtube.com origin (the content script) — the requests are same-origin.
 *
 * @throws {TranscriptUnavailableError} when the video has no captions.
 */
export async function fetchYouTubeTranscript(
  videoId: string,
  { pageHtml, preferredLanguages = [], fetchFn = fetch }: FetchTranscriptOptions = {},
): Promise<LoadedTranscript> {
  let apiKey = pageHtml ? extractInnertubeApiKey(pageHtml) : null;
  if (!apiKey) {
    const res = await fetchFn(`https://www.youtube.com/watch?v=${videoId}`, { credentials: 'omit' });
    if (!res.ok) throw new Error(`YouTube answered ${res.status} for the watch page`);
    apiKey = extractInnertubeApiKey(await res.text());
  }
  if (!apiKey) throw new Error('Could not find the YouTube API key on the page');

  const playerRes = await fetchFn(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: INNERTUBE_CONTEXT, videoId }),
  });
  if (!playerRes.ok) throw new Error(`YouTube answered ${playerRes.status} for the player data`);
  const player = await playerRes.json();

  const tracks: CaptionTrack[] =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const track = pickCaptionTrack(tracks, preferredLanguages);
  if (!track) {
    const status = player?.playabilityStatus?.status;
    throw new TranscriptUnavailableError(
      status && status !== 'OK'
        ? player?.playabilityStatus?.reason || 'This video can’t be played here.'
        : 'This video has no captions.',
    );
  }

  const xmlRes = await fetchFn(track.baseUrl.replace('&fmt=srv3', ''), { credentials: 'omit' });
  if (!xmlRes.ok) throw new Error(`YouTube answered ${xmlRes.status} for the captions`);
  const cues = parseTimedTextXml(await xmlRes.text());
  if (cues.length === 0) throw new TranscriptUnavailableError('The captions for this video are empty.');

  return {
    videoId,
    languageCode: track.languageCode,
    generated: track.kind === 'asr',
    sentences: groupIntoSentences(cues),
  };
}
