import { useEffect, useRef, useCallback } from 'react';

interface UseSessionTimerOptions {
  tokenExpiresAt: number | null;
  onExpiringSoon?: () => void;
  onExpired?: () => void;
  warningBufferMs?: number;
}

/**
 * Hook to track token expiration and trigger callbacks when the session
 * is about to expire or has expired.
 */
export function useSessionTimer({
  tokenExpiresAt,
  onExpiringSoon,
  onExpired,
  warningBufferMs = 60000, // 1 minute before expiry
}: UseSessionTimerOptions) {
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimers();

    if (!tokenExpiresAt) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = tokenExpiresAt - now;
    const timeUntilWarning = timeUntilExpiry - warningBufferMs;

    // Already expired
    if (timeUntilExpiry <= 0) {
      onExpired?.();
      return;
    }

    // Set up warning timer
    if (timeUntilWarning > 0 && onExpiringSoon) {
      warningTimerRef.current = setTimeout(() => {
        onExpiringSoon();
      }, timeUntilWarning);
    }

    // Set up expiry timer
    expiryTimerRef.current = setTimeout(() => {
      onExpired?.();
    }, timeUntilExpiry);

    return () => {
      clearTimers();
    };
  }, [tokenExpiresAt, onExpiringSoon, onExpired, warningBufferMs, clearTimers]);

  return {
    clearTimers,
    isExpired: tokenExpiresAt ? Date.now() >= tokenExpiresAt : false,
    timeUntilExpiry: tokenExpiresAt ? Math.max(0, tokenExpiresAt - Date.now()) : null,
  };
}
