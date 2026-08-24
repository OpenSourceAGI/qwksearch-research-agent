/**
 * @fileoverview Tests for `ReadAloudController`: chunk ordering, the one-chunk-ahead
 * prefetch, stop/pause control, and the fallback to the browser's own synthesizer
 * when no TTS endpoint answers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadAloudController } from '../speech/client/read-aloud';

/** Minimal stand-in for HTMLAudioElement: `play()` starts, then fires `ended`. */
class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  paused = false;
  private listeners = new Map<string, (() => void)[]>();

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(name: string, cb: () => void) {
    const existing = this.listeners.get(name) ?? [];
    this.listeners.set(name, [...existing, cb]);
  }

  play() {
    setTimeout(() => this.listeners.get('ended')?.forEach((cb) => cb()), 0);
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

const audioBlob = () => new Blob(['audio'], { type: 'audio/wav' });

beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReadAloudController', () => {
  it('speaks every chunk in order and reports the end', async () => {
    const spoken: string[] = [];
    const onEnd = vi.fn();

    const controller = new ReadAloudController({
      maxChunkLength: 20,
      synthesize: async (text) => {
        spoken.push(text);
        return audioBlob();
      },
      onChunk: ({ index }) => void index,
      onEnd,
    });

    await controller.speak(
      'The first sentence here. The second sentence here. The third one here.'
    );

    expect(spoken.length).toBeGreaterThan(1);
    expect(spoken.join(' ')).toContain('The first sentence here.');
    expect(spoken.join(' ')).toContain('The third one here.');
    expect(onEnd).toHaveBeenCalledWith('finished');
    expect(controller.getState()).toBe('idle');
  });

  it('reports each chunk with its position in the queue', async () => {
    const chunks: { text: string; index: number; total: number }[] = [];

    const controller = new ReadAloudController({
      maxChunkLength: 20,
      synthesize: async () => audioBlob(),
      onChunk: (chunk) => chunks.push(chunk),
    });

    await controller.speak('Alpha beta gamma. Delta epsilon zeta. Eta theta iota.');

    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
    expect(new Set(chunks.map((c) => c.total)).size).toBe(1);
    expect(chunks[0].total).toBe(chunks.length);
  });

  it('ignores empty text', async () => {
    const synthesize = vi.fn();
    const controller = new ReadAloudController({ synthesize });

    await controller.speak('   \n  ');

    expect(synthesize).not.toHaveBeenCalled();
    expect(controller.getState()).toBe('idle');
  });

  it('stops mid-utterance without speaking the remaining chunks', async () => {
    const spoken: string[] = [];
    const onEnd = vi.fn();

    const controller = new ReadAloudController({
      maxChunkLength: 20,
      synthesize: async (text) => {
        spoken.push(text);
        return audioBlob();
      },
      onChunk: ({ index }) => {
        if (index === 0) controller.stop();
      },
      onEnd,
    });

    await controller.speak(
      'One one one one one. Two two two two two. Three three three three. Four four four four.'
    );

    // The prefetch runs one chunk ahead, so at most the first two are ever
    // synthesized — never the whole document.
    expect(spoken.length).toBeLessThanOrEqual(2);
    expect(onEnd).toHaveBeenCalledWith('stopped');
    expect(controller.getState()).toBe('idle');
    expect(controller.isActive()).toBe(false);
  });

  it('tracks paused and resumed state', async () => {
    const states: string[] = [];
    const controller = new ReadAloudController({
      maxChunkLength: 20,
      synthesize: async () => audioBlob(),
      onStateChange: (state) => states.push(state),
      onChunk: ({ index }) => {
        if (index === 0) {
          controller.pause();
          expect(controller.getState()).toBe('paused');
          controller.resume();
        }
      },
    });

    await controller.speak('First chunk of text. Second chunk of text.');

    expect(states).toContain('paused');
    expect(states[states.length - 1]).toBe('idle');
  });

  it('falls back to the browser synthesizer when the endpoint is unreachable', async () => {
    const utterances: string[] = [];
    class FakeUtterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }

    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal('speechSynthesis', {
      speak: (utterance: FakeUtterance) => {
        utterances.push(utterance.text);
        setTimeout(() => utterance.onend?.(), 0);
      },
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('no route mounted');
      })
    );

    const onEnd = vi.fn();
    const controller = new ReadAloudController({ maxChunkLength: 20, onEnd });

    await controller.speak(
      'Spoken without a server. Straight from the browser. No round trip at all. Not even once more.'
    );

    expect(utterances.length).toBeGreaterThan(2);
    expect(onEnd).toHaveBeenCalledWith('finished');
    // Once the endpoint has failed it is not probed again — only the first
    // chunk and the one prefetched alongside it ever reach the network.
    expect(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeLessThanOrEqual(2);
  });
});
