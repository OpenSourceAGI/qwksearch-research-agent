/**
 * Making sure a chat routed to OpenRouter has a key before it is sent.
 *
 * A key can come from three places: the deployment's own `OPENROUTER_API_KEY`,
 * the local user's OpenRouter provider settings, or the key a visitor saved in
 * this browser (which `GuestKeyForm` also writes to those settings). With none
 * of them the first message would fail with an invalid-key error, so the send
 * path asks for one up front instead.
 *
 * The main chat runs on the server and only reads the first two: a key that
 * lives only in this browser (saved before the database was reset, or when
 * copying it to the account failed) is invisible to it. So before a server
 * chat, a browser-only key is copied to the account, and if that cannot be
 * done the message goes to the browser-side guest chat instead of failing.
 */
import { useAiInfraStore } from '@/store/aiInfra';
import { aiProviderSelectors } from '@/store/aiInfra/selectors';
import { getServerConfigStoreState } from '@/store/serverConfig';

import { applyGuestKeyToAccount, OPENROUTER_PROVIDER_ID } from './accountSync';
import { createGuestKeyModal } from './createGuestKeyModal';
import { useGuestOpenRouterStore } from './store';

/** A key the server-side chat can read: the deployment's or the account's. */
export const hasServerSideOpenRouterKey = (): boolean =>
  !!getServerConfigStoreState()?.serverConfig.hasServerOpenRouterKey ||
  !!aiProviderSelectors.providerKeyVaults(OPENROUTER_PROVIDER_ID)(useAiInfraStore.getState())
    ?.apiKey;

export const hasOpenRouterKey = (): boolean =>
  hasServerSideOpenRouterKey() || !!useGuestOpenRouterStore.getState().apiKey;

const promptForKey = (): Promise<boolean> =>
  new Promise((resolve) => {
    createGuestKeyModal(
      () => resolve(true),
      () => resolve(false),
    );
  });

/**
 * Resolves `true` when a key is available, prompting for one if needed;
 * `false` when the visitor closes the prompt without saving a key.
 */
export const ensureOpenRouterKey = (): Promise<boolean> => {
  if (hasOpenRouterKey()) return Promise.resolve(true);
  return promptForKey();
};

/**
 * Where an OpenRouter chat from the home input should run:
 * - `server`: the main chat, which has a key it can read;
 * - `browser`: the guest chat, which calls OpenRouter from this page with the
 *   browser's key, because the server could not be given one;
 * - `cancelled`: no key anywhere and the visitor closed the prompt.
 */
export type OpenRouterChatRoute = 'browser' | 'cancelled' | 'server';

const copyBrowserKeyToAccount = async (): Promise<OpenRouterChatRoute> => {
  const browserKey = useGuestOpenRouterStore.getState().apiKey;
  if (!browserKey) return 'cancelled';
  if (hasServerSideOpenRouterKey()) return 'server';

  try {
    await applyGuestKeyToAccount(browserKey);
  } catch (error) {
    console.error('[openrouter] Could not copy the browser key to the account:', error);
    return 'browser';
  }
  return 'server';
};

export const resolveOpenRouterChatRoute = async (): Promise<OpenRouterChatRoute> => {
  if (hasServerSideOpenRouterKey()) return 'server';
  if (useGuestOpenRouterStore.getState().apiKey) return copyBrowserKeyToAccount();

  if (!(await promptForKey())) return 'cancelled';
  // The form copies the key to the account itself; this only matters when that
  // copy failed and the key ended up in the browser alone.
  return copyBrowserKeyToAccount();
};

/**
 * Like `ensureOpenRouterKey`, but only a key held in this browser counts: the
 * guest chat calls OpenRouter straight from the page, so a server-side key is
 * no use to it.
 */
export const ensureGuestKey = (): Promise<boolean> => {
  if (useGuestOpenRouterStore.getState().apiKey) return Promise.resolve(true);
  return promptForKey();
};
