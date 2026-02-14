import { useEffect, useRef, useCallback } from 'react';

interface UseSessionActivityOptions {
  onActivity?: () => void;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Hook to detect user activity (mouse, keyboard, touch events).
 * Triggers callback on activity with debouncing to avoid excessive calls.
 */
export function useSessionActivity({
  onActivity,
  debounceMs = 30000, // 30 seconds default debounce
  enabled = true,
}: UseSessionActivityOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleActivity = useCallback(() => {
    if (!enabled || !onActivity) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Only trigger if debounce period has passed
    if (timeSinceLastActivity >= debounceMs) {
      lastActivityRef.current = now;
      onActivity();
    } else if (!debounceTimerRef.current) {
      // Schedule a callback for when debounce period ends
      const remaining = debounceMs - timeSinceLastActivity;
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        lastActivityRef.current = Date.now();
        onActivity();
      }, remaining);
    }
  }, [onActivity, debounceMs, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleActivity, enabled]);

  return {
    lastActivity: lastActivityRef.current,
    triggerActivity: handleActivity,
  };
}
