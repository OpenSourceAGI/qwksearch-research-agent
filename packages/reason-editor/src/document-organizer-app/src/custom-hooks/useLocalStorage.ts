/**
 * @module useLocalStorage
 * @description React hook for persisting state in the browser's `localStorage`.
 */
import { useState } from 'react';

/**
 * React hook that mirrors React's `useState` but persists the value under `key`
 * in `localStorage`. Reads the stored value on first render and falls back to
 * `initialValue` when the key is absent or the stored JSON is invalid.
 *
 * @template T - Type of the value to store.
 * @param key - `localStorage` key to read/write.
 * @param initialValue - Default value used when the key is not yet set.
 * @returns A `[value, setValue]` tuple identical to `useState`.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed = JSON.parse(item);
      // If parsed is an empty array and initialValue is a non-empty array, use initialValue
      if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(initialValue) && initialValue.length > 0) {
        return initialValue;
      }
      return parsed;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}
