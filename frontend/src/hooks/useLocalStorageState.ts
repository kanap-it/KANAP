import { useState, useCallback } from 'react';

/**
 * A React hook that persists state in localStorage.
 *
 * Reads the stored value on mount (SSR-safe fallback to `defaultValue`).
 * Writes back to localStorage on every setter call.
 *
 * @param key        The localStorage key.
 * @param defaultValue  Fallback when nothing is stored or parsing fails.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Ignore quota / private-mode errors.
        }
        return next;
      });
    },
    [key],
  );

  return [state, setValue];
}
