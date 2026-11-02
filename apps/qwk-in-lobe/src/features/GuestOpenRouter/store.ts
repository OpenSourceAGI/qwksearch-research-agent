/**
 * The visitor's OpenRouter key, as typed into the key prompt.
 *
 * It is persisted in this browser's localStorage so it can be copied to the
 * visitor's account again if the account loses it (a new guest cookie, a reset
 * database): the LobeHub chat runs on the server and only reads the account's
 * key, never this one directly.
 */
import { createJSONStorage, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { normalizeOpenRouterKey } from './openrouter';

export const GUEST_OPENROUTER_STORAGE_KEY = 'qwk-guest-openrouter';

export interface GuestOpenRouterState {
  apiKey: string;
}

export interface GuestOpenRouterActions {
  clearKey: () => void;
  setKey: (key: string) => void;
}

export type GuestOpenRouterStore = GuestOpenRouterState & GuestOpenRouterActions;

export const useGuestOpenRouterStore = createWithEqualityFn<GuestOpenRouterStore>()(
  persist(
    (set) => ({
      apiKey: '',

      clearKey: () => set({ apiKey: '' }),

      setKey: (key) => set({ apiKey: normalizeOpenRouterKey(key) }),
    }),
    {
      name: GUEST_OPENROUTER_STORAGE_KEY,
      partialize: (s) => ({ apiKey: s.apiKey }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
  shallow,
);

export const guestOpenRouterSelectors = {
  hasKey: (s: GuestOpenRouterStore) => !!s.apiKey,
  /** `sk-or-v1-…abcd`: enough to recognise a key without showing it. */
  maskedKey: (s: GuestOpenRouterStore) =>
    s.apiKey ? `${s.apiKey.slice(0, 9)}…${s.apiKey.slice(-4)}` : '',
};
