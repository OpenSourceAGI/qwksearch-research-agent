import { describe, expect, it, vi } from 'vitest';
import { applyAudioGain, convertAudioBufferToWav, resampleAudio } from '../speech/utils/audio-utils.js';

/**
 * A stand-in for the browser's AudioBuffer. The helpers under test only use
 * numberOfChannels / length / sampleRate / duration / getChannelData, so this
 * covers the whole surface they touch without needing a Web Audio implementation.
 */
function fakeAudioBuffer(channels, { sampleRate = 16000 } = {}) {
  return {
    numberOfChannels: channels.length,
    length: channels[0].length,
    sampleRate,
    duration: channels[0].length / sampleRate,
    getChannelData: (i) => channels[i],
  };
}

function readString(view, offset, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

describe('convertAudioBufferToWav', () => {
  it('emits a RIFF/WAVE container', () => {
    const wav = convertAudioBufferToWav(fakeAudioBuffer([new Float32Array([0, 0.5, -0.5, 1])]));
    const view = new DataView(wav);

    expect(readString(view, 0, 4)).toBe('RIFF');
    expect(readString(view, 8, 4)).toBe('WAVE');
    expect(readString(view, 12, 4)).toBe('fmt ');
    expect(readString(view, 36, 4)).toBe('data');
  });

  it('sizes the buffer as a 44-byte header plus 16-bit samples', () => {
    const samples = new Float32Array(10);

    const wav = convertAudioBufferToWav(fakeAudioBuffer([samples]));

    expect(wav.byteLength).toBe(44 + 10 * 2);
    expect(new DataView(wav).getUint32(4, true)).toBe(36 + 10 * 2);
    expect(new DataView(wav).getUint32(40, true)).toBe(10 * 2);
  });

  it('writes a 16-bit mono PCM format block', () => {
    const view = new DataView(convertAudioBufferToWav(fakeAudioBuffer([new Float32Array(4)])));

    expect(view.getUint32(16, true)).toBe(16); // subchunk1 size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // channels
    expect(view.getUint32(24, true)).toBe(16000); // sample rate
    expect(view.getUint32(28, true)).toBe(16000 * 1 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
  });

  it('reflects channel count and sample rate in the header', () => {
    const buffer = fakeAudioBuffer([new Float32Array(4), new Float32Array(4)], { sampleRate: 44100 });

    const view = new DataView(convertAudioBufferToWav(buffer));

    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(28, true)).toBe(44100 * 2 * 2);
    expect(view.getUint16(32, true)).toBe(4);
  });

  it('scales float samples to signed 16-bit', () => {
    const wav = convertAudioBufferToWav(fakeAudioBuffer([new Float32Array([0, 1, -1, 0.5])]));
    const view = new DataView(wav);

    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x7fff);
    // setInt16 truncates toward zero rather than rounding.
    expect(view.getInt16(50, true)).toBe(Math.trunc(0.5 * 0x7fff));
  });

  it('clamps out-of-range samples instead of wrapping', () => {
    const wav = convertAudioBufferToWav(fakeAudioBuffer([new Float32Array([4, -4])]));
    const view = new DataView(wav);

    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x7fff);
  });
});

describe('applyAudioGain', () => {
  // The helper allocates its output through `new AudioContext()`, so stub the
  // one factory method it calls.
  function stubAudioContext() {
    const created = [];
    vi.stubGlobal(
      'AudioContext',
      class {
        createBuffer(numberOfChannels, length, sampleRate) {
          const data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
          const buffer = {
            numberOfChannels,
            length,
            sampleRate,
            getChannelData: (i) => data[i],
          };
          created.push(buffer);
          return buffer;
        }
      }
    );
    return created;
  }

  it('multiplies every sample by the gain factor', () => {
    stubAudioContext();
    const input = fakeAudioBuffer([new Float32Array([0.1, 0.2, -0.1])]);

    const out = applyAudioGain(input, 2);

    expect(Array.from(out.getChannelData(0)).map((v) => Number(v.toFixed(5)))).toEqual([0.2, 0.4, -0.2]);
    vi.unstubAllGlobals();
  });

  it('defaults to a 1.5x boost', () => {
    stubAudioContext();

    const out = applyAudioGain(fakeAudioBuffer([new Float32Array([0.2])]));

    expect(out.getChannelData(0)[0]).toBeCloseTo(0.3, 5);
    vi.unstubAllGlobals();
  });

  it('clamps amplified samples to [-1, 1]', () => {
    stubAudioContext();

    const out = applyAudioGain(fakeAudioBuffer([new Float32Array([0.9, -0.9])]), 4);

    expect(out.getChannelData(0)[0]).toBe(1);
    expect(out.getChannelData(0)[1]).toBe(-1);
    vi.unstubAllGlobals();
  });

  it('leaves the input buffer untouched', () => {
    stubAudioContext();
    const samples = new Float32Array([0.25]);

    applyAudioGain(fakeAudioBuffer([samples]), 2);

    expect(samples[0]).toBe(0.25);
    vi.unstubAllGlobals();
  });

  it('processes every channel and preserves the buffer geometry', () => {
    stubAudioContext();
    const input = fakeAudioBuffer([new Float32Array([0.1]), new Float32Array([0.2])], {
      sampleRate: 48000,
    });

    const out = applyAudioGain(input, 2);

    expect(out.numberOfChannels).toBe(2);
    expect(out.sampleRate).toBe(48000);
    expect(out.getChannelData(0)[0]).toBeCloseTo(0.2, 5);
    expect(out.getChannelData(1)[0]).toBeCloseTo(0.4, 5);
    vi.unstubAllGlobals();
  });
});

describe('resampleAudio', () => {
  it('renders the source through an OfflineAudioContext at the target rate', async () => {
    const rendered = { sampleRate: 16000 };
    const start = vi.fn();
    const connect = vi.fn();
    const source = { buffer: null, connect, start };
    const destination = {};
    const constructorArgs = [];

    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        constructor(...args) {
          constructorArgs.push(args);
          this.destination = destination;
        }
        createBufferSource() {
          return source;
        }
        async startRendering() {
          return rendered;
        }
      }
    );

    const input = fakeAudioBuffer([new Float32Array(48000)], { sampleRate: 48000 });
    const result = await resampleAudio(input, 16000);

    // 1 channel, targetRate * duration frames, at the target rate.
    expect(constructorArgs[0]).toEqual([1, 16000 * input.duration, 16000]);
    expect(source.buffer).toBe(input);
    expect(connect).toHaveBeenCalledWith(destination);
    expect(start).toHaveBeenCalledWith(0);
    expect(result).toBe(rendered);

    vi.unstubAllGlobals();
  });
});
