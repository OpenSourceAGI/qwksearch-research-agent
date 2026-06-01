/**
 * @fileoverview All formatter classes for transcript formatting
 */

import type { FetchedTranscript } from './models/fetched-transcript';
import type { FetchedTranscriptSnippet } from './types';

/**
 * Base abstract class for all transcript formatters.
 */
export abstract class Formatter {
  abstract formatTranscript(transcript: FetchedTranscript, options?: any): string;
  abstract formatTranscripts(transcripts: FetchedTranscript[], options?: any): string;
}

/**
 * Formatter that converts transcripts to pretty-printed JSON format.
 */
export class PrettyPrintFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript): string {
    return JSON.stringify(transcript.toRawData(), null, 2);
  }

  formatTranscripts(transcripts: FetchedTranscript[]): string {
    return JSON.stringify(transcripts.map(t => t.toRawData()), null, 2);
  }
}

/**
 * Formatter that converts transcripts to JSON format.
 */
export class JSONFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options?: { indent?: number }): string {
    return JSON.stringify(transcript.toRawData(), null, options?.indent);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options?: { indent?: number }): string {
    return JSON.stringify(transcripts.map(t => t.toRawData()), null, options?.indent);
  }
}

/**
 * Formatter that converts transcripts to plain text format with no timestamps.
 */
export class TextFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript): string {
    return transcript.snippets.map(snippet => snippet.text).join('\n');
  }

  formatTranscripts(transcripts: FetchedTranscript[]): string {
    return transcripts.map(t => this.formatTranscript(t)).join('\n\n\n');
  }
}

/**
 * Formatter that converts transcripts to article format with character-to-timestamp mappings.
 * Returns full text as a string along with character position to time pairings.
 */
export class ArticleFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript): string {
    // Build full text content
    const fullText = transcript.snippets.map(snippet => snippet.text).join(' ');

    // Build timestamp mappings - track which character position corresponds to which time
    const timestamps: Array<[number, number]> = [];
    let charPosition = 0;

    for (const snippet of transcript.snippets) {
      // Record the character position and start time for this snippet
      timestamps.push([charPosition, snippet.start]);
      charPosition += snippet.text.length + 1; // +1 for the space separator
    }

    // Calculate character-per-second speeds at intervals
    const speedsEveryCharPeriod: { [key: number]: number } = {};
    const valueCharPeriod = 100;

    for (const [char, time] of timestamps) {
      const speed = Math.floor(char / time) - 10;
      speedsEveryCharPeriod[Math.floor(char / valueCharPeriod)] = speed;
    }

    // Compress the speed data
    const speeds = Object.keys(speedsEveryCharPeriod).map(
      (timeKey) => speedsEveryCharPeriod[parseInt(timeKey)]
    );

    const compressed: number[] = [];
    const compressedCount: number[] = [];
    let currentNum = speeds[0];
    let count = 1;

    for (let i = 1; i < speeds.length; i++) {
      if (speeds[i] === currentNum) {
        count++;
      } else {
        compressed.push(currentNum);
        compressedCount.push(count);
        currentNum = speeds[i];
        count = 1;
      }
    }
    compressed.push(currentNum);
    compressedCount.push(count);

    // Convert counts to cumulative positions
    let total = 0;
    const cumulativeCounts = compressedCount.map((c) => {
      total += c;
      return total;
    });

    // Format output with speeds and timestamps
    const speedsData = compressed.join(',') + '  ' + cumulativeCounts.join(',');

    // Remove extra spaces from full text
    const cleanedText = fullText.replace(/\s+/g, ' ');

    return JSON.stringify({
      text: cleanedText,
      timestamps: speedsData,
      wordCount: cleanedText.split(/\s+/).length,
      charCount: cleanedText.length
    }, null, 2);
  }

  formatTranscripts(transcripts: FetchedTranscript[]): string {
    return transcripts.map(t => this.formatTranscript(t)).join('\n\n');
  }
}

/**
 * Base class for subtitle formatters (SRT, WebVTT).
 */
abstract class SubtitleFormatterBase extends TextFormatter {
  protected abstract formatTimestamp(h: number, m: number, s: number, ms: number): string;
  protected abstract formatTranscriptHeader(lines: string[]): string;
  protected abstract formatSubtitleEntry(index: number, timeRange: string, snippet: FetchedTranscriptSnippet): string;

  protected secondsToTimestamp(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const remainder = timeInSeconds % 3600;
    const minutes = Math.floor(remainder / 60);
    const seconds = Math.floor(remainder % 60);
    const milliseconds = Math.round((timeInSeconds - Math.floor(timeInSeconds)) * 1000);

    return this.formatTimestamp(hours, minutes, seconds, milliseconds);
  }

  formatTranscript(transcript: FetchedTranscript): string {
    const formattedLines: string[] = [];

    for (let i = 0; i < transcript.snippets.length; i++) {
      const snippet = transcript.snippets[i];
      const snippetEndTime = snippet.start + snippet.duration;

      const actualEndTime =
        i < transcript.snippets.length - 1 && transcript.snippets[i + 1].start < snippetEndTime
          ? transcript.snippets[i + 1].start
          : snippetEndTime;

      const timeRangeText = `${this.secondsToTimestamp(snippet.start)} --> ${this.secondsToTimestamp(actualEndTime)}`;

      formattedLines.push(this.formatSubtitleEntry(i, timeRangeText, snippet));
    }

    return this.formatTranscriptHeader(formattedLines);
  }
}

/**
 * Formatter that converts transcripts to SRT (SubRip) format.
 */
export class SRTFormatter extends SubtitleFormatterBase {
  protected formatTimestamp(h: number, m: number, s: number, ms: number): string {
    const pad = (n: number, w: number) => n.toString().padStart(w, '0');
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
  }

  protected formatTranscriptHeader(lines: string[]): string {
    return lines.join('\n\n') + '\n';
  }

  protected formatSubtitleEntry(index: number, timeRange: string, snippet: FetchedTranscriptSnippet): string {
    return `${index + 1}\n${timeRange}\n${snippet.text}`;
  }
}

/**
 * Formatter that converts transcripts to WebVTT format.
 */
export class WebVTTFormatter extends SubtitleFormatterBase {
  protected formatTimestamp(h: number, m: number, s: number, ms: number): string {
    const pad = (n: number, w: number) => n.toString().padStart(w, '0');
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
  }

  protected formatTranscriptHeader(lines: string[]): string {
    return 'WEBVTT\n\n' + lines.join('\n\n') + '\n';
  }

  protected formatSubtitleEntry(index: number, timeRange: string, snippet: FetchedTranscriptSnippet): string {
    return `${timeRange}\n${snippet.text}`;
  }
}

/**
 * Raised when an unknown formatter type is requested.
 */
export class UnknownFormatterType extends Error {
  constructor(formatterType: string) {
    super(`Unknown formatter type: ${formatterType}. Available types: json, text, srt, webvtt, pretty, article`);
    this.name = 'UnknownFormatterType';
    Object.setPrototypeOf(this, UnknownFormatterType.prototype);
  }
}

/**
 * Utility class for loading formatters by type string.
 */
export class FormatterLoader {
  load(formatterType?: string): Formatter {
    const type = formatterType?.toLowerCase() || 'pretty';

    switch (type) {
      case 'json':
        return new JSONFormatter();
      case 'text':
        return new TextFormatter();
      case 'article':
        return new ArticleFormatter();
      case 'srt':
        return new SRTFormatter();
      case 'webvtt':
        return new WebVTTFormatter();
      case 'pretty':
        return new PrettyPrintFormatter();
      default:
        throw new UnknownFormatterType(type);
    }
  }
}
