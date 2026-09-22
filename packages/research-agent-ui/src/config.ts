/**
 * @fileoverview Package-wide configuration: app branding, defaults, and the auth client contract, overridable via configureResearchAgentUI.
 */
export interface FooterLink {
  url: string;
  text: string;
  icon?: string;
}

/**
 * Auth client shape expected by `SessionProvider`. Matches the subset of the
 * better-auth React client actually used by this package, so the consuming
 * app can pass its own configured instance without this package depending on
 * `better-auth` directly.
 */
export interface ResearchAgentAuthClient {
  // Typed loosely (rather than mirroring better-auth's overloaded generic
  // signature) since this only needs to describe the shape SessionProvider
  // destructures (`{ data } = await getSession()`), not fully reproduce it.
  getSession: (...args: any[]) => Promise<any>;
  oneTap: (opts: { fetchOptions: { onSuccess: () => void } }) => void;
  signIn: { social: (opts: { provider: string; callbackURL: string }) => void };
  signOut: (opts: { fetchOptions: { onSuccess: () => void } }) => Promise<any>;
}

export interface ResearchAgentUIConfig {
  /** Product name shown in document titles, etc. */
  appName: string;
  /** Default prompt used to summarize an extracted article. */
  defaultSummarizePrompt: string;
  /** Max character length for article body sent to the LLM. */
  maxArticleLength: number;
  /** Chrome Web Store URL advertised on the homepage. */
  downloadChromeUrl: string;
  /** Microsoft Store product ID advertised on the homepage. */
  downloadWindowsStoreId: string;
  /** Links rendered in the homepage footer. */
  footerLinks: FooterLink[];
  /** Google API key used by the Google Drive file picker. */
  googleApiKey: string;
  /**
   * Google Cloud project number, passed to the Drive picker as its app ID.
   * The connector holds the per-file `drive.file` scope rather than blanket
   * Drive access, and Google only grants the app a picked file when the
   * picker knows which app is asking — so leaving this empty means picked
   * files come back but downloading them 403s.
   */
  googleAppId: string;
  /** Whether to auto-trigger image/video media search after a response completes. */
  getAutoMediaSearch: () => boolean;
  /**
   * URL of the app's own icon, shown as the "Research" entry in the app dock.
   * Served by the consuming app (it is a static asset, not a bundled one) so
   * that a host with different branding can point at its own file.
   */
  appIconUrl: string;
  /**
   * Endpoint serving the trending-news wire format (Wikipedia's daily ranking
   * joined to headlines) for the homepage widget. Defaults to this app's own
   * `/api/news/trending` route, which keeps the News API key server-side; a
   * host without that route — the desktop app, the extension — should point
   * this at an absolute URL, and the user's `trendingNewsApiUrl` setting
   * overrides it either way.
   */
  trendingNewsApiUrl: string;
  /**
   * Endpoint serving the host app's site-wide news-widget settings (whether
   * the widget is on, how many topics it shows, whether a user's own topic
   * list counts). Defaults to this app's `/api/news/settings`. Set it to an
   * empty string on a host that has no such route — the widget then follows
   * the local settings alone.
   */
  trendingNewsSettingsUrl: string;
  /**
   * Requests that the settings UI be opened. Lets the consuming app render
   * settings in a modal (e.g. on large desktop screens) instead of navigating
   * to the `/settings` route. Return `true` when the request was handled — the
   * caller then skips route navigation; return `false`/`undefined` to fall back
   * to navigating to the settings page (e.g. on small screens). `section`
   * optionally deep-links to a specific settings tab.
   */
  onOpenSettings?: (section?: string) => boolean;
  /**
   * Requests that a chat from history be opened in place. Lets the consuming
   * app switch to the chat as a tab within its current workspace (e.g. on
   * the homepage) instead of navigating to the `/c/<chatId>` route. Return
   * `true` when handled — the caller then skips route navigation; return
   * `false`/`undefined` (or leave unset) to fall back to navigating to
   * `/c/<chatId>`.
   */
  onOpenChat?: (chatId: string) => boolean;
}

export const researchAgentUIConfig: ResearchAgentUIConfig = {
  appName: 'QwkSearch',
  defaultSummarizePrompt: 'Summarize in bullet points and bold topics',
  maxArticleLength: 1500,
  downloadChromeUrl:
    'https://chromewebstore.google.com/detail/tab-manager-ai/manhemnhmipdhdpabojcplebckhckeko',
  downloadWindowsStoreId: '9PCGF9GNK460',
  footerLinks: [],
  googleApiKey: '',
  googleAppId: '',
  getAutoMediaSearch: () => true,
  appIconUrl: '/apple-touch-icon.png',
  trendingNewsApiUrl: '/api/news/trending',
  trendingNewsSettingsUrl: '/api/news/settings',
};

/**
 * Overrides default configuration. Call once, before rendering, from the
 * consuming app (e.g. in the root layout) to wire up app-specific values.
 */
export function configureResearchAgentUI(
  overrides: Partial<ResearchAgentUIConfig>,
): void {
  Object.assign(researchAgentUIConfig, overrides);
}
