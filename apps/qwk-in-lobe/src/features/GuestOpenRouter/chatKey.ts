/**
 * Making sure a chat routed to OpenRouter has a key before it is sent.
 *
 * A key can come from three places: the deployment's own `OPENROUTER_API_KEY`,
 * the local user's OpenRouter provider settings, or the key a visitor saved in
 * this browser (which `GuestKeyForm` also writes to those settings). With none
 * of them the first message would fail with an invalid-key error, so the send
 * path asks for one up front instead.
 */
import { useAiInfraStore } from '@/store/aiInfra';
import { aiProviderSelectors } from '@/store/aiInfra/selectors';
import { getServerConfigStoreState } from '@/store/serverConfig';

import { OPENROUTER_PROVIDER_ID } from './accountSync';
import { createGuestKeyModal } from './createGuestKeyModal';
import { useGuestOpenRouterStore } from './store';

export const hasOpenRouterKey = (): boolean =>
  !!getServerConfigStoreState()?.serverConfig.hasServerOpenRouterKey ||
  !!useGuestOpenRouterStore.getState().apiKey ||
  !!aiProviderSelectors.providerKeyVaults(OPENROUTER_PROVIDER_ID)(useAiInfraStore.getState())
    ?.apiKey;

/**
 * Resolves `true` when a key is available, prompting for one if needed;
 * `false` when the visitor closes the prompt without saving a key.
 */
export const ensureOpenRouterKey = (): Promise<boolean> => {
  if (hasOpenRouterKey()) return Promise.resolve(true);

  return new Promise((resolve) => {
    createGuestKeyModal(
      () => resolve(true),
      () => resolve(false),
    );
  });
};

/**
 * Like `ensureOpenRouterKey`, but only a key held in this browser counts: the
 * guest chat calls OpenRouter straight from the page, so a server-side key is
 * no use to it.
 */
export const ensureGuestKey = (): Promise<boolean> => {
  if (useGuestOpenRouterStore.getState().apiKey) return Promise.resolve(true);

  return new Promise((resolve) => {
    createGuestKeyModal(
      () => resolve(true),
      () => resolve(false),
    );
  });
};
