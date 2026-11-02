/**
 * Lets a guest's OpenRouter key drive the LobeHub chat.
 *
 * There is no sign-in: each visitor runs as their own guest user, so the key is
 * written to that user's OpenRouter provider config — the same place
 * Settings → Providers saves it, encrypted with the key-vault secret. The main
 * chat reads keys from there (`initModelRuntimeFromDB`).
 */
import { useAiInfraStore } from '@/store/aiInfra';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { GUEST_DEFAULT_MODEL } from './openrouter';

export const OPENROUTER_PROVIDER_ID = 'openrouter';

/** True once the local user's session is loaded, so the key can be saved to it. */
export const useIsGuestSession = () => useUserStore(authSelectors.isLogin);

/** Saves the key as the account's OpenRouter key, enables the provider and points new agents at it. */
export const applyGuestKeyToAccount = async (apiKey: string) => {
  const aiInfra = useAiInfraStore.getState();

  await aiInfra.updateAiProviderConfig(OPENROUTER_PROVIDER_ID, { keyVaults: { apiKey } });
  await aiInfra.toggleProviderEnabled(OPENROUTER_PROVIDER_ID, true);
  await useUserStore.getState().updateDefaultAgent({
    config: { model: GUEST_DEFAULT_MODEL, provider: OPENROUTER_PROVIDER_ID },
  });
  await aiInfra.refreshAiProviderRuntimeState();
};

/** Clears the key from the account; the provider stays configured but keyless. */
export const removeGuestKeyFromAccount = async () => {
  const aiInfra = useAiInfraStore.getState();

  await aiInfra.updateAiProviderConfig(OPENROUTER_PROVIDER_ID, { keyVaults: { apiKey: '' } });
  await aiInfra.refreshAiProviderRuntimeState();
};
