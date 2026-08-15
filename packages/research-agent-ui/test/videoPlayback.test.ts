/**
 * @fileoverview Unit tests for the video-result playback routing decision.
 */
import { describe, expect, it } from 'vitest';
import { getVideoPlaybackTarget } from '../src/lib/videoPlayback';

describe('getVideoPlaybackTarget', () => {
  it('plays inline when the source has a valid https iframe_src', () => {
    const result = getVideoPlaybackTarget({
      url: 'https://example.com/watch?v=abc',
      iframe_src: 'https://inv.example.com/embed/abc',
    });

    expect(result).toEqual({ type: 'inline', src: 'https://inv.example.com/embed/abc' });
  });

  it('plays inline for a plain http iframe_src too', () => {
    const result = getVideoPlaybackTarget({
      url: 'http://example.com/watch?v=abc',
      iframe_src: 'http://peertube.example.com/videos/embed/abc',
    });

    expect(result).toEqual({ type: 'inline', src: 'http://peertube.example.com/videos/embed/abc' });
  });

  it('falls back to the external url when iframe_src is missing', () => {
    const result = getVideoPlaybackTarget({ url: 'https://example.com/watch?v=abc' });

    expect(result).toEqual({ type: 'external', url: 'https://example.com/watch?v=abc' });
  });

  it('falls back to external when iframe_src is an empty string', () => {
    const result = getVideoPlaybackTarget({ url: 'https://example.com/watch?v=abc', iframe_src: '' });

    expect(result).toEqual({ type: 'external', url: 'https://example.com/watch?v=abc' });
  });

  it('falls back to external when iframe_src is not a well-formed URL', () => {
    const result = getVideoPlaybackTarget({
      url: 'https://example.com/watch?v=abc',
      iframe_src: 'not a url',
    });

    expect(result).toEqual({ type: 'external', url: 'https://example.com/watch?v=abc' });
  });

  it('rejects a javascript: iframe_src rather than embedding it', () => {
    const result = getVideoPlaybackTarget({
      url: 'https://example.com/watch?v=abc',
      iframe_src: 'javascript:alert(1)',
    });

    expect(result).toEqual({ type: 'external', url: 'https://example.com/watch?v=abc' });
  });

  it('returns an empty external url when neither url nor iframe_src is present', () => {
    const result = getVideoPlaybackTarget({});

    expect(result).toEqual({ type: 'external', url: '' });
  });
});
