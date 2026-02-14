import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useSessionActivity } from '../hooks/useSessionActivity';
import { getLastActivityAt, getRefreshTtlMs, sessionStorageKeys, touchLastActivity } from './sessionStorage';

interface SessionManagerProps {
  children: React.ReactNode;
}

// Refresh token 1 minute before access token expires
const REFRESH_BUFFER_MS = 60 * 1000;

// Debounce activity detection to 30 seconds
const ACTIVITY_DEBOUNCE_MS = 30 * 1000;

/**
 * SessionManager wraps the app and handles:
 * - Monitoring session expiration
 * - Refreshing tokens on user activity (before expiry)
 * - Auto-redirecting to login when session expires
 */
export function SessionManager({ children }: SessionManagerProps) {
  const { token, tokenExpiresAt, refreshAccessToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRefreshingRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(() => getLastActivityAt());
  const [refreshTtlMs, setRefreshTtlMs] = useState<number | null>(() => getRefreshTtlMs());

  // Skip session management on public pages
  const isPublicPage = ['/login', '/forgot-password', '/reset-password', '/signup'].some(
    (path) => location.pathname.startsWith(path)
  );

  const handleSessionExpired = useCallback(() => {
    if (!isPublicPage) {
      void logout();
      navigate('/login?sessionExpired=true', { replace: true });
    }
  }, [logout, navigate, isPublicPage]);

  const handleTokenRefresh = useCallback(async () => {
    if (isRefreshingRef.current || !token) return;
    if (refreshTtlMs && lastActivityAt && Date.now() - lastActivityAt >= refreshTtlMs) {
      handleSessionExpired();
      return;
    }

    isRefreshingRef.current = true;
    try {
      const success = await refreshAccessToken();
      if (!success) handleSessionExpired();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [token, refreshAccessToken, refreshTtlMs, lastActivityAt, handleSessionExpired]);

  // Monitor token expiration
  useSessionTimer({
    tokenExpiresAt: isPublicPage ? null : tokenExpiresAt,
    onExpiringSoon: handleTokenRefresh,
    onExpired: handleSessionExpired,
    warningBufferMs: REFRESH_BUFFER_MS,
  });

  // Refresh token on user activity (before it expires)
  useSessionActivity({
    onActivity: () => {
      // Only refresh if we have a token and it's going to expire soon
      if (!token || isPublicPage) return;

      const now = touchLastActivity();
      setLastActivityAt(now);

      if (!tokenExpiresAt) return;
      const timeUntilExpiry = tokenExpiresAt - Date.now();
      // Refresh if less than 5 minutes until expiry (more aggressive than timer)
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        void handleTokenRefresh();
      }
    },
    debounceMs: ACTIVITY_DEBOUNCE_MS,
    enabled: !!token && !isPublicPage,
  });

  // On mount, check if token is already expired
  useEffect(() => {
    if (!token || isPublicPage) return;

    if (tokenExpiresAt && tokenExpiresAt <= Date.now()) {
      // Token expired, try to refresh
      void handleTokenRefresh();
    }
  }, [token, tokenExpiresAt, handleTokenRefresh, isPublicPage]);

  useEffect(() => {
    if (!token || isPublicPage) return;
    setLastActivityAt(getLastActivityAt());
    setRefreshTtlMs(getRefreshTtlMs());
  }, [token, isPublicPage]);

  useEffect(() => {
    if (!token || isPublicPage) return;
    if (!lastActivityAt) {
      const now = touchLastActivity();
      setLastActivityAt(now);
    }
  }, [token, isPublicPage, lastActivityAt]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === sessionStorageKeys.lastActivity) {
        const next = event.newValue ? parseInt(event.newValue, 10) : null;
        setLastActivityAt(Number.isFinite(next) ? next : null);
      }
      if (event.key === sessionStorageKeys.refreshTtl) {
        const next = event.newValue ? parseInt(event.newValue, 10) : null;
        setRefreshTtlMs(Number.isFinite(next) ? next : null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (!token || isPublicPage || !refreshTtlMs || !lastActivityAt) return;

    const timeUntilIdle = lastActivityAt + refreshTtlMs - Date.now();
    if (timeUntilIdle <= 0) {
      handleSessionExpired();
      return;
    }
    idleTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, timeUntilIdle);
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [token, isPublicPage, refreshTtlMs, lastActivityAt, handleSessionExpired]);

  return <>{children}</>;
}
