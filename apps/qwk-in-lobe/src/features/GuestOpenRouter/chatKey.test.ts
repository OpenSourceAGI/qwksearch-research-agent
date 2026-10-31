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
vi.mock('./accountSync', () => ({ OPENROUTER_PROVIDER_ID: 'openrouter' }));
vi.mock('./createGuestKeyModal', () => ({ createGuestKeyModal }));
vi.mock('./store', () => ({
  useGuestOpenRouterStore: { getState: () => ({ apiKey: state.guestKey }) },
}));

const { ensureGuestKey, ensureOpenRouterKey, hasOpenRouterKey } = await import('./chatKey');

describe('OpenRouter chat key', () => {
  beforeEach(() => {
    state.accountKey = '';
    state.guestKey = '';
    state.serverKey = false;
    createGuestKeyModal.mockReset();
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
});
