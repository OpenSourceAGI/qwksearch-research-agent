/**
 * @fileoverview Tests for `LiveTranscriber` against a stubbed browser recognizer:
 * interim vs. committed text, the auto-restart after Chromium's idle stop, and that
 * a deliberate stop stays stopped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveTranscriber, isTranscriptionSupported } from '../speech/client/live-transcriber';

/** Stand-in for the Web Speech API recognizer, driven manually from each test. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  started = 0;
  stopped = 0;
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {
    this.started += 1;
    this.onstart?.();
  }

  stop() {
    this.stopped += 1;
  }

  /** Emit a recognition result. `resultIndex` mirrors the real event shape. */
  emit(entries: { transcript: string; isFinal: boolean }[]) {
    this.onresult?.({
      resultIndex: 0,
      results: entries.map((entry) => ({
        0: { transcript: entry.transcript },
        isFinal: entry.isFinal,
      })),
    });
  }
}

beforeEach(() => {
  FakeRecognition.instances = [];
  vi.stubGlobal('window', { SpeechRecognition: FakeRecognition });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LiveTranscriber', () => {
  it('reports support when a recognizer is present', () => {
    expect(isTranscriptionSupported()).toBe(true);
  });

  it('streams interim text and commits settled phrases', async () => {
    const partials: string[] = [];
    const commits: string[] = [];

    const transcriber = new LiveTranscriber({
      onPartial: (text) => partials.push(text),
      onCommit: (text) => commits.push(text),
    });

    await transcriber.start();
    expect(transcriber.isListening()).toBe(true);

    const recognition = FakeRecognition.instances[0];
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);

    recognition.emit([{ transcript: 'hello', isFinal: false }]);
    recognition.emit([{ transcript: 'hello there', isFinal: false }]);
    recognition.emit([{ transcript: 'hello there world', isFinal: true }]);

    expect(partials).toContain('hello');
    expect(partials).toContain('hello there');
    // A commit supersedes the interim phrase rather than clearing it first, so
    // consumers writing interim text into a document do not erase and re-insert.
    expect(partials).not.toContain('');
    expect(commits).toEqual(['hello there world']);
  });

  it('restarts itself when the browser ends the session on its own', async () => {
    const transcriber = new LiveTranscriber();
    await transcriber.start();

    const recognition = FakeRecognition.instances[0];
    recognition.onend?.();

    expect(recognition.started).toBe(2);
    expect(transcriber.isListening()).toBe(true);
  });

  it('stays stopped after an explicit stop', async () => {
    const states: boolean[] = [];
    const transcriber = new LiveTranscriber({ onStateChange: (v) => states.push(v) });

    await transcriber.start();
    const recognition = FakeRecognition.instances[0];
    await transcriber.stop();
    recognition.onend?.();

    expect(recognition.stopped).toBe(1);
    expect(recognition.started).toBe(1);
    expect(transcriber.isListening()).toBe(false);
    expect(states).toEqual([true, false]);
  });

  it('surfaces real errors but ignores routine silence', async () => {
    const onError = vi.fn();
    const transcriber = new LiveTranscriber({ onError });

    await transcriber.start();
    const recognition = FakeRecognition.instances[0];

    recognition.onerror?.({ error: 'no-speech' });
    expect(onError).not.toHaveBeenCalled();

    recognition.onerror?.({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('toggles listening on and off', async () => {
    const transcriber = new LiveTranscriber();

    await transcriber.toggle();
    expect(transcriber.isListening()).toBe(true);

    await transcriber.toggle();
    expect(transcriber.isListening()).toBe(false);
  });
});
