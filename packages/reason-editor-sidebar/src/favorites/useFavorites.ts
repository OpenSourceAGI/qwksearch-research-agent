/**
 * @module useFavorites
 * @description React view of the stored favorites and last-used times,
 * kept in sync across every mounted sidebar and browser tab.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
  LAST_USED_STORAGE_KEY,
  getFavorites,
  getLastUsed,
  toggleFavorite as toggleStoredFavorite,
  type TimestampMap,
} from './favorites';

export interface UseFavoritesResult {
  /** Favorited document IDs → when they were favorited. */
  favorites: TimestampMap;
  /** Document IDs → when they were last opened. */
  lastUsed: TimestampMap;
  /** Whether a document is favorited. */
  isFavorite: (id: string) => boolean;
  /** Flips a document's favorite state. */
  toggleFavorite: (id: string) => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<TimestampMap>(() => getFavorites());
  const [lastUsed, setLastUsed] = useState<TimestampMap>(() => getLastUsed());

  useEffect(() => {
    const reload = () => {
      setFavorites(getFavorites());
      setLastUsed(getLastUsed());
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === FAVORITES_STORAGE_KEY ||
        event.key === LAST_USED_STORAGE_KEY
      ) {
        reload();
      }
    };
    window.addEventListener(FAVORITES_CHANGED_EVENT, reload);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, reload);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const isFavorite = useCallback((id: string) => id in favorites, [favorites]);
  const toggleFavorite = useCallback((id: string) => {
    toggleStoredFavorite(id);
  }, []);

  return { favorites, lastUsed, isFavorite, toggleFavorite };
}
