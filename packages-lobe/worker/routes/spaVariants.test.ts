// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildSignInRedirect,
  isAuthSpaRoute,
  isBackendPath,
  isPublicSpaRoute,
  parseAcceptLanguage,
  resolveSpaVariant,
  toSafeLocale,
} from './spaVariants';

const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });

describe('toSafeLocale', () => {
  it('keeps supported locales and falls back to en-US otherwise', () => {
    expect(toSafeLocale('zh-CN')).toBe('zh-CN');
    expect(toSafeLocale('../../api/dev')).toBe('en-US');
    expect(toSafeLocale(undefined)).toBe('en-US');
  });
});

describe('parseAcceptLanguage', () => {
  it('picks the highest weighted supported language', () => {
    expect(parseAcceptLanguage('fr-FR;q=0.5, ja-JP;q=0.9')).toBe('ja-JP');
  });

  it('maps region-less and Chinese script tags', () => {
    expect(parseAcceptLanguage('de')).toBe('de-DE');
    expect(parseAcceptLanguage('zh-Hant-TW')).toBe('zh-TW');
    expect(parseAcceptLanguage('ar-EG')).toBe('ar');
  });

  it('defaults to en-US when nothing matches', () => {
    expect(parseAcceptLanguage('xx-YY')).toBe('en-US');
    expect(parseAcceptLanguage(null)).toBe('en-US');
  });
});

describe('resolveSpaVariant', () => {
  it('prefers ?hl over the cookie and the browser language', () => {
    const variant = resolveSpaVariant(
      req('https://qwksearch.com/agent?hl=ja-JP', {
        'accept-language': 'de-DE',
        'cookie': 'LOBE_LOCALE=zh-CN',
      }),
    );
    expect(variant).toEqual({ explicitLocale: 'ja-JP', isMobile: false, locale: 'ja-JP' });
  });

  it('falls back to the cookie, then accept-language', () => {
    expect(
      resolveSpaVariant(req('https://qwksearch.com/', { cookie: 'LOBE_LOCALE=zh-CN' })).locale,
    ).toBe('zh-CN');
    expect(
      resolveSpaVariant(req('https://qwksearch.com/', { 'accept-language': 'pt-BR' })).locale,
    ).toBe('pt-BR');
  });

  it('detects mobile devices from the user agent', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(resolveSpaVariant(req('https://qwksearch.com/', { 'user-agent': ua })).isMobile).toBe(
      true,
    );
  });
});

describe('route classification', () => {
  it('routes auth pages to the auth SPA', () => {
    expect(isAuthSpaRoute('/signin')).toBe(true);
    expect(isAuthSpaRoute('/oauth/consent/abc')).toBe(true);
    expect(isAuthSpaRoute('/agent')).toBe(false);
  });

  it('never serves the SPA shell for backend prefixes', () => {
    expect(isBackendPath('/api/auth/get-session')).toBe(true);
    expect(isBackendPath('/trpc/lambda/user.getUserState')).toBe(true);
    expect(isBackendPath('/f/abc')).toBe(true);
    expect(isBackendPath('/agent/123')).toBe(false);
  });

  it('gates protected pages and allows public ones', () => {
    expect(isPublicSpaRoute('/share/topic/1')).toBe(true);
    expect(isPublicSpaRoute('/verify/run-1')).toBe(true);
    expect(isPublicSpaRoute('/agent/123')).toBe(false);
    expect(isPublicSpaRoute('/')).toBe(false);
  });
});

describe('buildSignInRedirect', () => {
  it('preserves callback, locale and attribution', () => {
    const url = buildSignInRedirect(
      req('https://qwksearch.com/agent/1?hl=zh-CN&utm_source=market'),
      'https://qwksearch.com',
    );
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/signin');
    expect(parsed.searchParams.get('callbackUrl')).toBe(
      'https://qwksearch.com/agent/1?hl=zh-CN&utm_source=market',
    );
    expect(parsed.searchParams.get('hl')).toBe('zh-CN');
    expect(parsed.searchParams.get('utm_source')).toBe('market');
  });
});
