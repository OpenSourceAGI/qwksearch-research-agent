import { describe, expect, it } from 'vitest';
import { checkIsVideoUrl } from '../src/utils/checkIsVideoUrl';

describe('checkIsVideoUrl', () => {
  it('rejects strings that are not URLs', () => {
    expect(checkIsVideoUrl('not a url')).toBe(false);
    expect(checkIsVideoUrl('')).toBe(false);
    expect(checkIsVideoUrl('example.com/video.mp4')).toBe(false);
  });

  it('accepts any valid URL when no providers are configured', () => {
    expect(checkIsVideoUrl('https://example.com/video.mp4')).toBe(true);
    expect(checkIsVideoUrl('https://example.com/video.mp4', [])).toBe(true);
  });

  it("treats a lone '.' as a wildcard", () => {
    expect(checkIsVideoUrl('https://anything.example/clip', ['.'])).toBe(true);
  });

  it('matches a hostname substring', () => {
    expect(checkIsVideoUrl('https://www.youtube.com/watch?v=abc', ['youtube.com'])).toBe(true);
    expect(checkIsVideoUrl('https://vimeo.com/12345', ['youtube.com'])).toBe(false);
  });

  it('accepts a URL matching any one of several providers', () => {
    const providers = ['youtube.com', 'vimeo.com'];

    expect(checkIsVideoUrl('https://vimeo.com/12345', providers)).toBe(true);
    expect(checkIsVideoUrl('https://dailymotion.com/12345', providers)).toBe(false);
  });

  it('supports a leading wildcard in a provider pattern', () => {
    expect(checkIsVideoUrl('https://www.youtube.com/watch', ['*.youtube.com'])).toBe(true);
    expect(checkIsVideoUrl('https://youtube.com/watch', ['*.youtube.com'])).toBe(false);
  });

  it('anchors wildcard patterns to the whole hostname', () => {
    // A pattern must match the entire host, so a lookalike domain is rejected.
    expect(checkIsVideoUrl('https://youtube.com.evil.test/watch', ['*.youtube.com'])).toBe(false);
  });

  it('escapes dots in wildcard patterns', () => {
    expect(checkIsVideoUrl('https://wwwXyoutubeXcom/watch', ['*.youtube.com'])).toBe(false);
  });

  it('ignores the path, query and protocol when matching the host', () => {
    expect(checkIsVideoUrl('http://vimeo.com/a/b/c?x=1#f', ['vimeo.com'])).toBe(true);
  });
});
