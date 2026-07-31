/**
 * External store for tracking editor content sync state.
 * This prevents the editor from re-rendering when content changes during typing.
 */

import { useRef, useCallback } from 'react';

interface SyncState {
  loadedContentKey: string | null;
  shouldSuppressNextLoad: boolean;
}

/**
 * Custom hook that maintains sync state externally to prevent
 * unnecessary re-renders during typing.
 *
 * Returns an object with methods to check and update sync state
 * without triggering component re-renders.
 */
export function useSyncStore() {
  const stateRef = useRef<SyncState>({
    loadedContentKey: null,
    shouldSuppressNextLoad: false,
  });

  const shouldLoadContent = useCallback((contentKey: string): boolean => {
    const state = stateRef.current;

    // If we just saved content, suppress the next load
    if (state.shouldSuppressNextLoad) {
      console.log('[SyncStore] ⏭️ Suppressing load (own onChange)');
      state.shouldSuppressNextLoad = false;
      return false;
    }

    // Only load if the content key has changed
    if (state.loadedContentKey === contentKey) {
      console.log('[SyncStore] ⏭️ Same contentKey, skipping reload');
      return false;
    }

    return true;
  }, []);

  const markContentLoaded = useCallback((contentKey: string) => {
    console.log('[SyncStore] ✅ Marking content loaded for key:', contentKey);
    stateRef.current.loadedContentKey = contentKey;
  }, []);

  const markContentSaved = useCallback(() => {
    console.log('[SyncStore] 💾 Marking content saved (will suppress next load)');
    stateRef.current.shouldSuppressNextLoad = true;
  }, []);

  return {
    shouldLoadContent,
    markContentLoaded,
    markContentSaved,
  };
}
