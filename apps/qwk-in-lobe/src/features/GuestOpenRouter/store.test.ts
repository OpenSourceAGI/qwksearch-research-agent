import { beforeEach, describe, expect, it } from 'vitest';

import {
  GUEST_OPENROUTER_STORAGE_KEY,
  guestOpenRouterSelectors,
  useGuestOpenRouterStore,
} from './store';

const KEY = 'sk-or-v1-0123456789abcdef';

/** What the persist middleware wrote to the browser storage it was created with. */
const persisted = () =>
  useGuestOpenRouterStore.persist.getOptions().storage!.getItem(GUEST_OPENROUTER_STORAGE_KEY) as {
    state: Record<string, unknown>;
  } | null;

describe('guest OpenRouter store', () => {
  beforeEach(() => {
    useGuestOpenRouterStore.setState({ apiKey: '' });
  });

  it('persists only the normalized key to localStorage', () => {
    useGuestOpenRouterStore.getState().setKey(`  Bearer ${KEY} `);

    expect(persisted()?.state).toEqual({ apiKey: KEY });
  });

  it('masks the key for display', () => {
    useGuestOpenRouterStore.getState().setKey(KEY);
    const state = useGuestOpenRouterStore.getState();

    expect(guestOpenRouterSelectors.hasKey(state)).toBe(true);
    expect(guestOpenRouterSelectors.maskedKey(state)).toBe('sk-or-v1-…cdef');
    expect(guestOpenRouterSelectors.maskedKey(state)).not.toContain('0123456789');
  });

  it('clearKey forgets the key', () => {
    useGuestOpenRouterStore.getState().setKey(KEY);
    useGuestOpenRouterStore.getState().clearKey();

    expect(useGuestOpenRouterStore.getState().apiKey).toBe('');
    expect(persisted()?.state.apiKey).toBe('');
  });
});
