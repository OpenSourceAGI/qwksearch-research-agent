import { FetchedTranscript } from '../models';

/**
 * Encodes speech speed from a fetched transcript into a compact run-length string.
 * Optionally prepends a YouTube embed iframe with data-timestamps for player sync.
 * @param transcript - A FetchedTranscript returned by fetchTranscript()
 * @param addPlayer - If true, prepends an iframe embed with data-timestamps attribute
 * @returns html content, word count, run-length encoded speed string, and raw timestamps
 */
export function encodeTranscriptSpeeds(
  transcript: FetchedTranscript,
  addPlayer = false
): {
  html: string;
  word_count: number;
  speeds: string;
} {
  let charCount = 0;
  const timestamps: [number, number][] = [];
  const textParts: string[] = [];

  for (const snippet of transcript.snippets) {
    textParts.push(snippet.text);
    charCount += snippet.text.length;
    if (snippet.start > 0) {
      timestamps.push([charCount, snippet.start]);
    }
  }

  const content = textParts.join(' ').replace(/\s+/g, ' ');
  const word_count = content.split(/\s+/).filter(Boolean).length;

  const speedValues = timestamps.map(([char, time]) => Math.floor(char / time) - 10);
  if (speedValues.length === 0) {
    return { html: content, word_count, speeds: '' };
  }

  const compressed: number[] = [];
  const compressedCount: number[] = [];
  let currentNum = speedValues[0];
  let count = 1;

  for (let i = 1; i < speedValues.length; i++) {
    if (speedValues[i] === currentNum) {
      count++;
    } else {
      compressed.push(currentNum);
      compressedCount.push(count);
      currentNum = speedValues[i];
      count = 1;
    }
  }
  compressed.push(currentNum);
  compressedCount.push(count);

  const speeds = compressed.map((val, i) => `${val}x${compressedCount[i]}`).join(',');

  const html = addPlayer
    ? `<iframe width="100%" height="315px" data-timestamps="${speeds}" ` +
      `src="https://www.youtube.com/embed/${transcript.videoId}" frameborder="0" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; ` +
      `gyroscope; picture-in-picture" allowfullscreen></iframe>${content}`
    : content;

  return { html, word_count, speeds };
}

/**
 * Given a character index in the joined transcript text, returns the interpolated
 * video timestamp in seconds. Uses the nearest snippet boundaries to interpolate.
 */
export function getTimestampAtChar(transcript: FetchedTranscript, charIndex: number): number {
  let charCount = 0;
  const points: [number, number][] = [[0, 0]]; // [cumulativeChars, seconds]

  for (const snippet of transcript.snippets) {
    charCount += snippet.text.length + 1; // +1 for the join space
    points.push([charCount, snippet.start]);
  }

  if (charIndex <= 0) return 0;
  if (charIndex >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 1; i < points.length; i++) {
    if (points[i][0] >= charIndex) {
      const [c0, t0] = points[i - 1];
      const [c1, t1] = points[i];
      const ratio = (charIndex - c0) / (c1 - c0);
      return t0 + ratio * (t1 - t0);
    }
  }

  return points[points.length - 1][1];
}

/**
 * Decompresses a speeds string produced by encodeTranscriptSpeeds back into a flat array.
 * Format: "12x3,8x7,15x1" → [12,12,12, 8,8,8,8,8,8,8, 15]
 */
export function decompressTimestampsArray(speeds: string): number[] {
  const decompressed: number[] = [];
  for (const part of speeds.split(',')) {
    const [num, count] = part.split('x');
    decompressed.push(...Array(parseInt(count)).fill(parseInt(num)));
  }
  return decompressed;
}
