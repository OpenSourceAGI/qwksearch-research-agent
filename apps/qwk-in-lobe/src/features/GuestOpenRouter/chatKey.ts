/**
 * Making sure a chat routed to OpenRouter has a key before it is sent.
 *
 * A key can come from three places: the deployment's own `OPENROUTER_API_KEY`,
 * the local user's OpenRouter provider settings, or the key a visitor saved in
 * this browser (which `GuestKeyForm` also writes to those settings). With none
 * of them the first message would fail with an invalid-key error, so the send
 * path asks for one up front instead.
 *
 * The LobeHub chat runs on the server and only reads the first two: a key that
 * lives only in this browser (saved before the database was reset, or under an
 * earlier guest cookie) is invisible to it. So before a chat, a browser-only
 * key is copied to the account; if that cannot be done the send is stopped
 * with the draft kept, rather than sent to fail with an invalid-key error.
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
 * Whether an OpenRouter chat from the home input can go to the LobeHub chat:
 * - `server`: it has a key it can read;
 * - `failed`: a key exists only in this browser and copying it to the account
 *   failed (usually the server is unreachable);
 * - `cancelled`: no key anywhere and the visitor closed the prompt.
 */
export type OpenRouterChatRoute = 'cancelled' | 'failed' | 'server';

const copyBrowserKeyToAccount = async (): Promise<OpenRouterChatRoute> => {
  const browserKey = useGuestOpenRouterStore.getState().apiKey;
  if (!browserKey) return 'cancelled';
  if (hasServerSideOpenRouterKey()) return 'server';

  try {
    await applyGuestKeyToAccount(browserKey);
  } catch (error) {
    console.error('[openrouter] Could not copy the browser key to the account:', error);
    return 'failed';
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
