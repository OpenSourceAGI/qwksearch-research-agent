import { describe, expect, it } from 'vitest';
import { isMobile } from '../src/utils/is-mobile';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_PHONE =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1';
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const CHROME_OS =
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';

describe('isMobile', () => {
  it('detects phone user agents', () => {
    expect(isMobile({ ua: IPHONE })).toBe(true);
    expect(isMobile({ ua: ANDROID_PHONE })).toBe(true);
  });

  it('rejects desktop user agents', () => {
    expect(isMobile({ ua: DESKTOP })).toBe(false);
  });

  it('excludes ChromeOS even though its UA says Mobile', () => {
    expect(isMobile({ ua: CHROME_OS })).toBe(false);
  });

  it('ignores tablets unless the tablet option is set', () => {
    expect(isMobile({ ua: IPAD })).toBe(false);
    expect(isMobile({ ua: IPAD, tablet: true })).toBe(true);
  });

  it('reads the user agent out of a request-like object', () => {
    expect(isMobile({ ua: { headers: { 'user-agent': IPHONE } } })).toBe(true);
    expect(isMobile({ ua: { headers: { 'user-agent': DESKTOP } } })).toBe(false);
  });

  it('returns false when no usable user agent is available', () => {
    expect(isMobile({ ua: { headers: {} } })).toBe(false);
    expect(isMobile({ ua: { headers: { 'user-agent': ['a', 'b'] } } })).toBe(false);
  });

  it('falls back to navigator.userAgent when no ua is passed', () => {
    // jsdom's default navigator is a desktop UA.
    expect(isMobile()).toBe(false);
  });
});
