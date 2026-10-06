import type { ResearchAgentAuthClient } from 'research-agent-ui';
import { API_BASE } from './grab-url-shim';

/** Where the side panel sends people to sign in: the web app's own login page. */
export const LOGIN_URL = `${API_BASE}/login`;
/** Where signing out falls back to when the API refuses the extension's request. */
export const ACCOUNT_URL = `${API_BASE}/settings`;

export interface QwkSearchUser {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

/**
 * Reads the QwkSearch session from the cookie the web app set at sign-in.
 * The extension's `<all_urls>` host permission lets an extension page send that
 * cookie cross-origin, so signing in once at qwksearch.com is all it takes.
 */
export async function fetchSession(fetchImpl: typeof fetch = fetch): Promise<QwkSearchUser | null> {
  try {
    const res = await fetchImpl(`${API_BASE}/api/auth/get-session`, { credentials: 'include' });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.user ?? null;
  } catch {
    return null;
  }
}

function openTab(url: string) {
  chrome.tabs.create({ url });
}

/** Opens the QwkSearch login page in a new tab. */
export function signIn() {
  openTab(LOGIN_URL);
}

/**
 * Signs out of QwkSearch. better-auth checks the Origin of a sign-out POST, and an
 * extension origin may not be trusted by the deployment, so when it is refused the
 * account page opens instead, where the web app's own sign-out works.
 */
export async function signOut(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`${API_BASE}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (res.ok) return true;
  } catch {
    // fall through to the account page
  }
  openTab(ACCOUNT_URL);
  return false;
}

/**
 * The research-agent-ui auth client for the extension. Sign-in opens the web
 * login page rather than an OAuth popup (an extension page can't complete the
 * redirect), and One Tap is off because it only works on the web app's origin.
 */
export const extensionAuthClient: ResearchAgentAuthClient = {
  getSession: async () => {
    const user = await fetchSession();
    return { data: user ? { user } : null };
  },
  oneTap: () => {},
  signIn: { social: () => signIn() },
  // SessionProvider's onSuccess navigates to "/", which is not a page inside an
  // extension, so reload the panel instead.
  signOut: async () => {
    if (await signOut()) location.reload();
  },
};
