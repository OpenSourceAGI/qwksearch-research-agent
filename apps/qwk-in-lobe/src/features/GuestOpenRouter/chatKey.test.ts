import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  accountKey: '' as string,
  guestKey: '' as string,
  serverKey: false,
}));
const createGuestKeyModal = vi.hoisted(() => vi.fn());

vi.mock('@/store/serverConfig', () => ({
  getServerConfigStoreState: () => ({
    serverConfig: { hasServerOpenRouterKey: state.serverKey },
  }),
}));
vi.mock('@/store/aiInfra', () => ({ useAiInfraStore: { getState: () => ({}) } }));
vi.mock('@/store/aiInfra/selectors', () => ({
  aiProviderSelectors: {
    providerKeyVaults: () => () => (state.accountKey ? { apiKey: state.accountKey } : undefined),
  },
}));
const applyGuestKeyToAccount = vi.hoisted(() => vi.fn());
vi.mock('./accountSync', () => ({ applyGuestKeyToAccount, OPENROUTER_PROVIDER_ID: 'openrouter' }));
vi.mock('./createGuestKeyModal', () => ({ createGuestKeyModal }));
vi.mock('./store', () => ({
  useGuestOpenRouterStore: { getState: () => ({ apiKey: state.guestKey }) },
}));

const { ensureGuestKey, ensureOpenRouterKey, hasOpenRouterKey, resolveOpenRouterChatRoute } =
  await import('./chatKey');

describe('OpenRouter chat key', () => {
  beforeEach(() => {
    state.accountKey = '';
    state.guestKey = '';
    state.serverKey = false;
    createGuestKeyModal.mockReset();
    applyGuestKeyToAccount.mockReset().mockImplementation(async (key: string) => {
      state.accountKey = key;
    });
  });

  it.each([
    ['the deployment', () => (state.serverKey = true)],
    ['the browser', () => (state.guestKey = 'sk-or-v1-guest')],
    ['the provider settings', () => (state.accountKey = 'sk-or-v1-account')],
  ])('finds a key held by %s', (_, give) => {
    expect(hasOpenRouterKey()).toBe(false);
    give();
    expect(hasOpenRouterKey()).toBe(true);
  });

  it('does not prompt when a key is already available', async () => {
    state.serverKey = true;

    await expect(ensureOpenRouterKey()).resolves.toBe(true);
    expect(createGuestKeyModal).not.toHaveBeenCalled();
  });

  it('prompts for a key and resolves true once one is saved', async () => {
    createGuestKeyModal.mockImplementation((onSaved: () => void) => onSaved());

    await expect(ensureOpenRouterKey()).resolves.toBe(true);
    expect(createGuestKeyModal).toHaveBeenCalledTimes(1);
  });

  it('resolves false when the prompt is closed without a key', async () => {
    createGuestKeyModal.mockImplementation((_onSaved: () => void, onDismiss: () => void) =>
      onDismiss(),
    );

    await expect(ensureOpenRouterKey()).resolves.toBe(false);
  });

  // The guest chat calls OpenRouter from the page, so a server key is no use to it.
  it('asks for a browser key for the guest chat even when the deployment has one', async () => {
    state.serverKey = true;
    createGuestKeyModal.mockImplementation((onSaved: () => void) => onSaved());

    await expect(ensureGuestKey()).resolves.toBe(true);
    expect(createGuestKeyModal).toHaveBeenCalledTimes(1);

    state.guestKey = 'sk-or-v1-guest';
    createGuestKeyModal.mockReset();
    await expect(ensureGuestKey()).resolves.toBe(true);
    expect(createGuestKeyModal).not.toHaveBeenCalled();
  });

  describe('resolveOpenRouterChatRoute', () => {
    it('uses the server chat when the deployment or account has a key', async () => {
      state.serverKey = true;
      await expect(resolveOpenRouterChatRoute()).resolves.toBe('server');

      state.serverKey = false;
      state.accountKey = 'sk-or-v1-account';
      await expect(resolveOpenRouterChatRoute()).resolves.toBe('server');

      expect(createGuestKeyModal).not.toHaveBeenCalled();
      expect(applyGuestKeyToAccount).not.toHaveBeenCalled();
    });

    // The server chat can't read a key that lives only in this browser.
    it('copies a browser-only key to the account before a server chat', async () => {
      state.guestKey = 'sk-or-v1-guest';

      await expect(resolveOpenRouterChatRoute()).resolves.toBe('server');
      expect(applyGuestKeyToAccount).toHaveBeenCalledWith('sk-or-v1-guest');
      expect(createGuestKeyModal).not.toHaveBeenCalled();
    });

    it('falls back to the browser chat when the key cannot be copied', async () => {
      state.guestKey = 'sk-or-v1-guest';
      applyGuestKeyToAccount.mockRejectedValue(new Error('server down'));

      await expect(resolveOpenRouterChatRoute()).resolves.toBe('browser');
    });

    it('prompts when no key exists anywhere, then uses the server chat', async () => {
      createGuestKeyModal.mockImplementation((onSaved: () => void) => {
        // The form saves to the browser and copies to the account.
        state.guestKey = 'sk-or-v1-new';
        state.accountKey = 'sk-or-v1-new';
        onSaved();
      });

      await expect(resolveOpenRouterChatRoute()).resolves.toBe('server');
      expect(createGuestKeyModal).toHaveBeenCalledTimes(1);
    });

    it('is cancelled when the prompt closes without a key', async () => {
      createGuestKeyModal.mockImplementation((_onSaved: () => void, onDismiss: () => void) =>
        onDismiss(),
      );

      await expect(resolveOpenRouterChatRoute()).resolves.toBe('cancelled');
    });
  });
});
