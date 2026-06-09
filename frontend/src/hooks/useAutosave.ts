import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UseAutosaveOptions {
  /** Debounce window before a scheduled save fires (ms). */
  delay?: number;
  /** How long the transient "Saved" state lingers before returning to idle (ms). */
  savedLingerMs?: number;
  /** Called when a save rejects. The error status is surfaced regardless. */
  onError?: (error: unknown) => void;
}

export interface AutosaveController {
  /** Reactive status for a subtle "Saving… / Saved" indicator. */
  status: AutosaveStatus;
  /**
   * Schedule a debounced save. The most recently scheduled save wins; if a save
   * is already in flight, the latest pending one runs immediately after it.
   */
  schedule: (save: () => Promise<void>) => void;
  /**
   * Cancel the debounce and run any pending/in-flight save now, resolving when
   * fully drained. Use on controlled transitions (tab/year/prev/next/close/Escape)
   * where persistence must complete before navigating. Resolves to false if the
   * save rejected (caller should abort the navigation to avoid losing the edit).
   */
  flush: () => Promise<boolean>;
  /** True when a save is pending (debouncing) or currently in flight. */
  isBusy: () => boolean;
}

/**
 * Debounced autosave orchestrator with an awaitable flush.
 *
 * Hard unloads (tab close / refresh) cannot reliably await an async PATCH — see
 * the bounded-flush note in the OPEX revamp plan. Reliable persistence is only
 * guaranteed on controlled transitions that call `flush()`.
 */
export default function useAutosave(options?: UseAutosaveOptions): AutosaveController {
  const delay = options?.delay ?? 700;
  const savedLingerMs = options?.savedLingerMs ?? 1500;
  const onError = options?.onError;

  const [status, setStatus] = useState<AutosaveStatus>('idle');

  const timerRef = useRef<number | null>(null);
  const savedTimerRef = useRef<number | null>(null);
  const pendingRef = useRef<null | (() => Promise<void>)>(null);
  const drainingRef = useRef<Promise<void> | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const clearSavedTimer = () => {
    if (savedTimerRef.current != null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  };

  const drain = useCallback(async (): Promise<void> => {
    // Coalesce concurrent drains onto a single in-flight promise.
    if (drainingRef.current) return drainingRef.current;
    const run = (async () => {
      try {
        while (pendingRef.current) {
          const fn = pendingRef.current;
          pendingRef.current = null;
          setStatus('saving');
          await fn();
        }
        setStatus('saved');
        clearSavedTimer();
        savedTimerRef.current = window.setTimeout(() => {
          savedTimerRef.current = null;
          setStatus('idle');
        }, savedLingerMs);
      } catch (error) {
        // Drop the pending payload so a failing endpoint is not hammered; the
        // caller can reschedule. Status stays 'error' until the next schedule.
        pendingRef.current = null;
        setStatus('error');
        onError?.(error);
        throw error;
      } finally {
        drainingRef.current = null;
      }
    })();
    drainingRef.current = run;
    return run;
  }, [onError, savedLingerMs]);

  const schedule = useCallback((save: () => Promise<void>) => {
    pendingRef.current = save;
    clearTimer();
    clearSavedTimer();
    setStatus('pending');
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void drain().catch(() => {
        /* surfaced via status / onError */
      });
    }, delay);
  }, [delay, drain]);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer();
    if (pendingRef.current || drainingRef.current) {
      try {
        await drain();
      } catch {
        // Surfaced via status / onError. Report failure so callers can abort navigation.
        return false;
      }
    }
    return true;
  }, [drain]);

  const isBusy = useCallback(
    () => pendingRef.current != null || drainingRef.current != null,
    [],
  );

  useEffect(() => () => {
    clearTimer();
    clearSavedTimer();
  }, []);

  return { status, schedule, flush, isBusy };
}
