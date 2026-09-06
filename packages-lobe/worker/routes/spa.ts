/**
 * Serves the LobeHub SPA shells from the Worker.
 *
 * Replaces the Next.js `src/app/spa/[variants]/[[...path]]/route.ts` and
 * `src/app/spa-auth/...` handlers plus the locale/device middleware. Built HTML
 * templates are read from the static assets binding (`/_spa/index.html`,
 * `/_spa-auth/index.auth.html`, optional `/_spa-mobile/index.mobile.html`) and
 * the server config is injected into `window.__SERVER_CONFIG__` exactly as the
 * Next route does, so the client bootstrap is unchanged.
 */
import { APPLE_APP_STORE_ID, BRANDING_NAME, ORG_NAME } from '@lobechat/business-const';
import { OG_URL } from '@lobechat/const';
import type { Context } from 'hono';
import { Hono } from 'hono';

import { buildSeoMeta as buildAuthSeoMeta } from '@/app/spa-auth/[locale]/[[...path]]/seoMeta';
import { auth } from '@/auth';
import { getServerFeatureFlagsValue } from '@/config/featureFlags';
import { OFFICIAL_URL } from '@/const/url';
import { isCustomORG } from '@/const/version';
import { appEnv } from '@/envs/app';
import { authEnv } from '@/envs/auth';
import { fileEnv } from '@/envs/file';
import { pythonEnv } from '@/envs/python';
import { translation } from '@/libs/i18n/serverTranslation';
import { buildAnalyticsConfig, renderSpaHtml } from '@/libs/spaHtml';
import { getServerGlobalConfig } from '@/server/globalConfig';
import { getServerAuthConfig } from '@/server/globalConfig/getServerAuthConfig';
import { type AuthSPAServerConfig, type SPAServerConfig } from '@/types/spaServerConfig';

import { getCfEnv } from '../cf/env';
import {
  buildLocaleCookie,
  buildSignInRedirect,
  isAuthSpaRoute,
  isBackendPath,
  isPublicSpaRoute,
  resolveSpaVariant,
} from './spaVariants';

export const SPA_TEMPLATE_PATHS = {
  auth: '/_spa-auth/index.auth.html',
  desktop: '/_spa/index.html',
  mobile: '/_spa-mobile/index.mobile.html',
} as const;

type TemplateKind = keyof typeof SPA_TEMPLATE_PATHS;

const templateCache = new Map<TemplateKind, string | null>();

/**
 * Load a built HTML template through the assets binding. Cached per isolate;
 * a missing optional template (mobile) resolves to `null`.
 */
export const loadTemplate = async (
  kind: TemplateKind,
  requestUrl: string,
  fetcher = getCfEnv()?.ASSETS,
): Promise<string | null> => {
  if (templateCache.has(kind)) return templateCache.get(kind) ?? null;

  if (!fetcher) {
    throw new Error('ASSETS binding is not configured; cannot serve the SPA shell');
  }

  const res = await fetcher.fetch(new Request(new URL(SPA_TEMPLATE_PATHS[kind], requestUrl)));
  const html = res.ok ? await res.text() : null;
  templateCache.set(kind, html);
  return html;
};

const buildClientEnv = () => ({
  marketBaseUrl: appEnv.MARKET_BASE_URL,
  pyodideIndexUrl: pythonEnv.NEXT_PUBLIC_PYODIDE_INDEX_URL,
  pyodidePipIndexUrl: pythonEnv.NEXT_PUBLIC_PYODIDE_PIP_INDEX_URL,
  s3FilePath: fileEnv.NEXT_PUBLIC_S3_FILE_PATH,
});

const buildMainSeoMeta = async (locale: string, isMobile: boolean): Promise<string> => {
  const { t } = await translation('metadata', locale);
  const title = t('chat.title', { appName: BRANDING_NAME });
  const description = t('chat.description', { appName: BRANDING_NAME });

  const metas = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${OFFICIAL_URL}" />`,
    `<meta property="og:image" content="${OG_URL}" />`,
    `<meta property="og:site_name" content="${BRANDING_NAME}" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${OG_URL}" />`,
    `<meta name="twitter:site" content="${isCustomORG ? `@${ORG_NAME}` : '@lobehub'}" />`,
  ];

  if (isMobile && APPLE_APP_STORE_ID) {
    metas.push(`<meta name="apple-itunes-app" content="app-id=${APPLE_APP_STORE_ID}" />`);
  }

  return metas.join('\n    ');
};

const withLocaleCookie = (response: Response, c: Context, locale?: string) => {
  if (!locale) return response;
  const hasCookie = (c.req.header('cookie') || '').includes('LOBE_LOCALE=');
  if (hasCookie) return response;

  const secure = new URL(c.req.url).protocol === 'https:';
  response.headers.append('set-cookie', buildLocaleCookie(locale as never, secure));
  return response;
};

const renderAuthSpa = async (c: Context) => {
  const { locale, explicitLocale } = resolveSpaVariant(c.req.raw);
  const template = await loadTemplate('auth', c.req.url);
  if (!template) return c.text('Auth SPA bundle is missing (build:spa:auth)', 503);

  const authConfig: AuthSPAServerConfig = {
    analyticsConfig: buildAnalyticsConfig(),
    config: getServerAuthConfig(),
    enableOIDC: authEnv.ENABLE_OIDC,
    featureFlags: getServerFeatureFlagsValue(),
    globalCDN: appEnv.CDN_USE_GLOBAL,
  };

  const seoMeta = await buildAuthSeoMeta(locale, new URL(c.req.url).pathname);
  const response = renderSpaHtml(template, { seoMeta, serverConfig: authConfig });
  return withLocaleCookie(response, c, explicitLocale);
};

const renderMainSpa = async (c: Context) => {
  const { locale, isMobile, explicitLocale } = resolveSpaVariant(c.req.raw);

  const template =
    (isMobile ? await loadTemplate('mobile', c.req.url) : null) ??
    (await loadTemplate('desktop', c.req.url));
  if (!template) return c.text('SPA bundle is missing (build:spa)', 503);

  const spaConfig: SPAServerConfig = {
    analyticsConfig: buildAnalyticsConfig({ desktop: true }),
    clientEnv: buildClientEnv(),
    config: await getServerGlobalConfig(),
    featureFlags: getServerFeatureFlagsValue(),
    isMobile,
  };

  const seoMeta = await buildMainSeoMeta(locale, isMobile);
  const response = renderSpaHtml(template, { seoMeta, serverConfig: spaConfig });
  return withLocaleCookie(response, c, explicitLocale);
};

/**
 * Session gate for protected SPA pages. Mirrors `betterAuthMiddleware`: only
 * the public allowlist is reachable anonymously, everything else bounces to
 * `/signin` with a callback URL.
 */
const requireSessionForProtectedPage = async (c: Context): Promise<Response | undefined> => {
  const { pathname } = new URL(c.req.url);
  if (isPublicSpaRoute(pathname) || isAuthSpaRoute(pathname)) return undefined;

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user) return undefined;
  } catch (error) {
    console.error('[spa] session lookup failed, treating as anonymous:', error);
  }

  return c.redirect(buildSignInRedirect(c.req.raw, appEnv.APP_URL), 302);
};

export const spaApp = new Hono();

spaApp.get('*', async (c) => {
  const { pathname } = new URL(c.req.url);

  if (isBackendPath(pathname)) return c.notFound();
  if (isAuthSpaRoute(pathname)) return renderAuthSpa(c);

  const redirect = await requireSessionForProtectedPage(c);
  if (redirect) return redirect;

  return renderMainSpa(c);
});
