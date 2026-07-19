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
  /** Whether to auto-trigger image/video media search after a response completes. */
  getAutoMediaSearch: () => boolean;
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
  getAutoMediaSearch: () => true,
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
