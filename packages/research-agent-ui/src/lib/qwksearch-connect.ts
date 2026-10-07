/**
 * @fileoverview "Sign in with QwkSearch" for sites that embed the research
 * agent (debate-ai.com, …).
 *
 * An embedding site has no QwkSearch session cookie — qwksearch.com's auth
 * routes are same-site only — so the embed used to run as a permanent guest.
 * With this module the login button instead sends the visitor through
 * QwkSearch's OAuth-style consent screen (`qwksearch.com/connect`, see
 * apps/qwksearch-web/lib/auth/connect.ts). The host's server finishes the
 * exchange, stores the user's QwkSearch API key in its own database, and
 * hands it back to the embed through a small session endpoint. Every request
 * the embed makes to the QwkSearch API then carries that key as `X-API-Key`,
 * so chats, history and the user's plan work as they do on qwksearch.com.
 *
 * The host provides three same-origin endpoints:
 *
 *   - `sessionUrl`   GET  → {@link QwkSearchConnectSession}
 *   - `connectUrl`   GET  → starts the flow (PKCE + redirect to /connect);
 *                    receives `?returnTo=<path>` to come back to
 *   - `disconnectUrl` POST → forgets the stored key
 *
 * @example
 * ```tsx
 * const authClient = createQwkSearchConnectAuthClient({
 *   sessionUrl: '/api/qwksearch/session',
 *   connectUrl: '/api/qwksearch/connect',
 *   disconnectUrl: '/api/qwksearch/disconnect',
 * });
 * <SessionProvider authClient={authClient} enableGoogleOneTap={false}>…
 * ```
 */
import type { ResearchAgentAuthClient } from '../config';

/** Default QwkSearch origin the embed's API calls go to. */
export const QWKSEARCH_DEFAULT_ORIGIN = 'https://qwksearch.com';

/** What the host's session endpoint answers. */
export interface QwkSearchConnectSession {
  connected: boolean;
  user?: { id: string; name: string; email?: string; image?: string | null } | null;
  /** The linked user's QwkSearch API key. */
  apiKey?: string | null;
  /** Lower-case QwkSearch plan key (`"free"`, `"pro"`, …). */
  plan?: string | null;
  /** Stripe Payment Link that upgrades this QwkSearch account, when on a free plan. */
  upgradeUrl?: string | null;
}

export interface QwkSearchConnectOptions {
  sessionUrl: string;
  connectUrl: string;
  disconnectUrl: string;
  /** Origin whose `/api/` requests get the key. Defaults to qwksearch.com. */
  qwksearchOrigin?: string;
  /** Called with every session the host reports (e.g. to show the plan). */
  onSession?: (session: QwkSearchConnectSession) => void;
}

// ---------------------------------------------------------------------------
// API key header scoping
// ---------------------------------------------------------------------------

let activeKey: string | null = null;
let activeOrigin = QWKSEARCH_DEFAULT_ORIGIN;
let installed = false;

/** True when `input` targets `<origin>/api/…`. */
export function isQwkSearchApiRequest(input: RequestInfo | URL, origin: string): boolean {
  let raw: string;
  if (typeof input === 'string') raw = input;
  else if (input instanceof URL) raw = input.href;
  else raw = (input as Request).url;
  try {
    const base = typeof window !== 'undefined' ? window.location.href : origin;
    const url = new URL(raw, base);
    return url.origin === origin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

/**
 * Wraps `fetch` once so that requests to `<origin>/api/` carry the linked
 * user's key. Covers every client the UI uses — qwksearch-api-client,
 * grab-url and plain fetch — without touching each call site. Requests to any
 * other URL, and every request while no key is set, pass through untouched.
 */
function installFetchHook(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!activeKey || !isQwkSearchApiRequest(input, activeOrigin)) return original(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('x-api-key') && !headers.has('authorization')) headers.set('X-API-Key', activeKey);
    return original(input, { ...init, headers });
  };
}

/**
 * Sets (or with `null`, clears) the QwkSearch API key the embed sends.
 * `origin` defaults to qwksearch.com.
 */
export function setQwkSearchApiKey(key: string | null, origin: string = QWKSEARCH_DEFAULT_ORIGIN): void {
  activeKey = key || null;
  activeOrigin = origin.replace(/\/+$/, '');
  if (activeKey) installFetchHook();
}

/** The key currently attached to QwkSearch API requests, if any. */
export function getQwkSearchApiKey(): string | null {
  return activeKey;
}

// ---------------------------------------------------------------------------
// Auth client
// ---------------------------------------------------------------------------

/** Where `connectUrl` should send the visitor back to: the page they are on. */
export function buildConnectStartUrl(connectUrl: string, returnTo?: string): string {
  const back =
    returnTo ?? (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/');
  const separator = connectUrl.includes('?') ? '&' : '?';
  return `${connectUrl}${separator}returnTo=${encodeURIComponent(back)}`;
}

/**
 * An auth client for `SessionProvider` (and better-auth-style
 * `useSession()` callers) that signs in through QwkSearch's connect flow.
 */
export function createQwkSearchConnectAuthClient(options: QwkSearchConnectOptions) {
  const origin = options.qwksearchOrigin ?? QWKSEARCH_DEFAULT_ORIGIN;
  let current: QwkSearchConnectSession = { connected: false };
  const listeners = new Set<() => void>();
  const publish = (session: QwkSearchConnectSession) => {
    current = session;
    setQwkSearchApiKey(session.connected ? session.apiKey ?? null : null, origin);
    options.onSession?.(session);
    listeners.forEach((listener) => listener());
  };

  let pending: Promise<QwkSearchConnectSession> | null = null;
  const load = (): Promise<QwkSearchConnectSession> => {
    pending ??= fetch(options.sessionUrl, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (res) => (res.ok ? ((await res.json()) as QwkSearchConnectSession) : { connected: false }))
      .catch(() => ({ connected: false }) as QwkSearchConnectSession)
      .then((session) => {
        publish(session);
        return session;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  const client = {
    /** The last session the host reported (no request). */
    getCachedSession: () => current,
    /** Re-reads the host's session endpoint (e.g. after an upgrade). */
    refresh: load,
    /** Subscribes to session changes; returns an unsubscribe function. */
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSession: async () => {
      const session = await load();
      return { data: session.connected && session.user ? { user: session.user } : null };
    },
    // One Tap signs in to *this* origin's Google client, which an embed has
    // none of; the connect flow replaces it.
    oneTap: (_opts?: { fetchOptions: { onSuccess: () => void } }) => {},
    signIn: {
      social: (_opts?: { provider: string; callbackURL: string }) => {
        if (typeof window !== 'undefined') window.location.assign(buildConnectStartUrl(options.connectUrl));
      },
    },
    signOut: async (opts?: { fetchOptions?: { onSuccess?: () => void } }) => {
      try {
        await fetch(options.disconnectUrl, { method: 'POST', credentials: 'same-origin' });
      } finally {
        publish({ connected: false });
        opts?.fetchOptions?.onSuccess?.();
      }
      return { data: null };
    },
  };
  return client satisfies ResearchAgentAuthClient;
}

export type QwkSearchConnectAuthClient = ReturnType<typeof createQwkSearchConnectAuthClient>;
