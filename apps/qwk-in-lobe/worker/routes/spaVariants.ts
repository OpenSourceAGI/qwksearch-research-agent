/**
 * Pure helpers that decide which SPA bundle and locale a request gets.
 *
 * This is the Worker port of `src/libs/next/proxy/define-config.ts`
 * (`defaultMiddleware` + `isPublicRoute`). Kept dependency-light so it can be
 * unit-tested without booting the LobeHub server graph.
 */
import { parse as parseCookie } from 'cookie';
import { UAParser } from 'ua-parser-js';

import { authSpaRoutes } from '@/libs/next/nextjsOnlyRoutes';

export const LOBE_LOCALE_COOKIE = 'LOBE_LOCALE';
export const DEFAULT_LANG = 'en-US';

export const SUPPORTED_LOCALES = [
  'ar',
  'bg-BG',
  'de-DE',
  'en-US',
  'es-ES',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'pt-BR',
  'ru-RU',
  'tr-TR',
  'zh-CN',
  'zh-TW',
  'vi-VN',
  'fa-IR',
  'it-IT',
  'pl-PL',
  'nl-NL',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Same allowlist semantics as `toSafeLocale` in the Next middleware. */
export const toSafeLocale = (locale?: string | null): SupportedLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(locale ?? '')
    ? (locale as SupportedLocale)
    : DEFAULT_LANG;

const matchLocale = (locale?: string): SupportedLocale | undefined => {
  if (!locale) return undefined;
  const lower = locale.toLowerCase();

  if (lower.startsWith('ar')) return 'ar';
  if (lower.startsWith('fa')) return 'fa-IR';
  if (lower.startsWith('cn') || lower.startsWith('zh-hans')) return 'zh-CN';
  if (lower.startsWith('zh-hant')) return 'zh-TW';

  return SUPPORTED_LOCALES.find((l) => l.toLowerCase().startsWith(lower)) ??
    SUPPORTED_LOCALES.find((l) => lower.startsWith(l.split('-')[0].toLowerCase()));
};

/**
 * Pick the best supported locale from an `Accept-Language` header.
 * A tiny, allocation-free replacement for `resolve-accept-language`.
 */
export const parseAcceptLanguage = (header?: string | null): SupportedLocale => {
  if (!header) return DEFAULT_LANG;

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      const weight = q ? Number.parseFloat(q.split('=')[1]) : 1;
      return { tag: tag.trim(), weight: Number.isNaN(weight) ? 0 : weight };
    })
    .filter((c) => c.tag && c.tag !== '*')
    .sort((a, b) => b.weight - a.weight);

  for (const candidate of candidates) {
    const matched = matchLocale(candidate.tag);
    if (matched) return matched;
  }

  return DEFAULT_LANG;
};

export interface SpaVariant {
  /** Locale explicitly requested with `?hl=` (already validated). */
  explicitLocale?: SupportedLocale;
  isMobile: boolean;
  locale: SupportedLocale;
}

/**
 * Locale precedence: `?hl=` search param → `LOBE_LOCALE` cookie → browser
 * `Accept-Language`. Device type comes from the User-Agent.
 */
export const resolveSpaVariant = (request: Request): SpaVariant => {
  const url = new URL(request.url);
  const hl = url.searchParams.get('hl') || undefined;
  const explicitLocale = hl ? toSafeLocale(hl) : undefined;

  const cookieHeader = request.headers.get('cookie');
  const cookieLocale = cookieHeader ? parseCookie(cookieHeader)[LOBE_LOCALE_COOKIE] : undefined;

  const locale =
    explicitLocale ??
    (cookieLocale ? toSafeLocale(cookieLocale) : parseAcceptLanguage(request.headers.get('accept-language')));

  const device = new UAParser(request.headers.get('user-agent') || '').getDevice();

  return { explicitLocale, isMobile: device.type === 'mobile', locale };
};

/**
 * Routes rendered by the standalone auth SPA bundle (`/_spa-auth`).
 */
export const isAuthSpaRoute = (pathname: string) =>
  authSpaRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

/**
 * Backend prefixes that must never fall through to the SPA HTML.
 */
export const BACKEND_PREFIXES = ['/api', '/trpc', '/webapi', '/oidc', '/oauth/connector', '/f/'];

export const isBackendPath = (pathname: string) =>
  BACKEND_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

const PUBLIC_ROUTE_PATTERNS = [
  '/signin',
  '/signup',
  '/auth-error',
  '/verify-email',
  '/reset-password',
  '/oauth/consent/(.*)',
  '/oauth/connector/callback',
  '/oidc/handoff',
  '/oidc/device/auth',
  '/oidc/token',
  '/oidc/interaction/(.*)',
  '/market-auth-callback',
  '/share(.*)',
  '/verify/(.*)',
  '/acceptance/(.*)',
  '/verify-im',
  // QwkSearch docs demo/share pages stay public like on qwksearch.com
  '/docs/share/(.*)',
];

const publicRouteRegexes = PUBLIC_ROUTE_PATTERNS.map((pattern) => {
  const regexStr = pattern
    .replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&')
    .replaceAll('\\(\\.\\*\\)', '.*');
  return new RegExp(`^${regexStr}$`);
});

/**
 * SPA pages a visitor may open without a session. Everything else redirects
 * to `/signin` (same policy as the Next middleware's `isPublicRoute`).
 */
export const isPublicSpaRoute = (pathname: string) =>
  publicRouteRegexes.some((regex) => regex.test(pathname));

export const buildSignInRedirect = (request: Request, appUrl: string): string => {
  const url = new URL(request.url);
  const callbackUrl = `${appUrl.replace(/\/$/, '')}${url.pathname}${url.search}`;
  const signInUrl = new URL('/signin', appUrl);
  signInUrl.searchParams.set('callbackUrl', callbackUrl);

  const hl = url.searchParams.get('hl');
  if (hl) signInUrl.searchParams.set('hl', hl);
  const utmSource = url.searchParams.get('utm_source');
  if (utmSource) signInUrl.searchParams.set('utm_source', utmSource);

  return signInUrl.toString();
};

export const buildLocaleCookie = (locale: SupportedLocale, secure: boolean) =>
  `${LOBE_LOCALE_COOKIE}=${encodeURIComponent(locale)}; Max-Age=${60 * 60 * 24 * 90}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
