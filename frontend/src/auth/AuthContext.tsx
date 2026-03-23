import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api';
import { clearSessionActivity, isIdleExpired, setRefreshTtlMs, touchLastActivity } from './sessionStorage';
import { setAccessToken } from './accessTokenStore';
import i18n, { detectBrowserLocale, LANGUAGE_OVERRIDE_STORAGE_KEY, SupportedLocale } from '../i18n';

type PermissionLevel = 'reader' | 'contributor' | 'member' | 'manager' | 'admin';
type Claims = {
  isGlobalAdmin: boolean;
  isBillingAdmin: boolean;
  isPlatformAdmin?: boolean;
  permissions: Record<string, PermissionLevel>;
};

type Profile = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  business_phone?: string | null;
  mobile_phone?: string | null;
  locale?: SupportedLocale | null;
  status: 'contact' | 'invited' | 'enabled' | 'disabled' | string;
  role?: string | null;
  roles?: Array<{ id: string; name: string }>;
  external_auth_provider?: string | null;
};

type Subscription = {
  plan_name?: string | null;
  seat_limit: number | null;
  seats_used: number;
  subscription_type?: 'monthly' | 'annual';
  payment_mode?: 'card' | 'bank_transfer';
  next_payment_at?: string | null;
  renewal_at?: string | null;
  status?: string | null;
  collection_method?: 'charge_automatically' | 'send_invoice' | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  cancel_at?: string | null;
  canceled_at?: string | null;
  currency?: string | null;
  amount?: number | null;
  amount_currency?: string | null;
  estimated_amount?: number | null;
  estimated_currency?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  default_payment_method_id?: string | null;
  default_payment_method_brand?: string | null;
  default_payment_method_last4?: string | null;
  latest_invoice_id?: string | null;
  latest_invoice_status?: string | null;
  latest_invoice_number?: string | null;
  latest_invoice_url?: string | null;
  latest_invoice_pdf?: string | null;
  latest_invoice_amount?: number | null;
  latest_invoice_currency?: string | null;
  latest_invoice_created?: string | null;
  days_until_due?: number | null;
  last_payment_error_code?: string | null;
  last_payment_error_message?: string | null;
  last_synced_at?: string | null;
  stripe_subscription_id?: string | null;
  canceled_at_effective?: string | null;
  stripe_customer_id?: string | null;
  is_subscription_healthy?: boolean;
  trial_days_remaining?: number | null;
  payment_due_at?: string | null;
  freeze_effective_at?: string | null;
};

type TenantAuth = {
  sso_provider: 'none' | 'entra' | string;
  sso_enabled: boolean;
};

type LoginResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
};

type AuthContextType = {
  token: string | null;
  tokenExpiresAt: number | null;
  isAuthenticating: boolean;
  profile: Profile | null;
  claims: Claims | null;
  subscription: Subscription | null;
  tenantAuth: TenantAuth | null;
  login: (response: LoginResponse) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  hasLevel: (resource: string, level: PermissionLevel) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearLegacyTokenStorage(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_expires_at');
}

function isLoginCallbackPath(pathname: string): boolean {
  return pathname === '/login/callback' || pathname.startsWith('/login/callback/');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tenantAuth, setTenantAuth] = useState<TenantAuth | null>(null);

  const clearAuthState = useCallback((opts?: { clearActivity?: boolean }) => {
    clearLegacyTokenStorage();
    if (opts?.clearActivity) {
      clearSessionActivity();
    }
    setAccessToken(null);
    setToken(null);
    setTokenExpiresAt(null);
    setProfile(null);
    setClaims(null);
    setSubscription(null);
    setTenantAuth(null);
  }, []);

  const applyAccessToken = useCallback((accessToken: string, expiresIn: number, refreshExpiresIn?: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    clearLegacyTokenStorage();
    if (refreshExpiresIn) {
      setRefreshTtlMs(refreshExpiresIn * 1000);
    }
    setAccessToken(accessToken);
    setToken(accessToken);
    setTokenExpiresAt(expiresAt);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore errors during logout
    }
    clearAuthState({ clearActivity: true });
  }, [clearAuthState]);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      setProfile(res.data?.profile ?? null);
      setClaims(res.data?.claims ?? null);
      setSubscription(res.data?.subscription ?? null);
      setTenantAuth(res.data?.tenantAuth ?? null);
    } catch (e: any) {
      // If unauthorized, logout
      if (e?.response?.status === 401) logout();
    }
  }, [token, logout]);

  const refreshAccessTokenInternal = useCallback(async (legacyRefreshToken?: string): Promise<boolean> => {
    if (isIdleExpired()) {
      clearAuthState({ clearActivity: true });
      return false;
    }
    try {
      const payload = legacyRefreshToken ? { refresh_token: legacyRefreshToken } : {};
      const res = await api.post('/auth/refresh', payload);
      const { access_token, expires_in, refresh_expires_in } = res.data as { access_token: string; expires_in: number; refresh_expires_in?: number };
      if (isIdleExpired()) {
        clearAuthState({ clearActivity: true });
        return false;
      }
      applyAccessToken(access_token, expires_in, refresh_expires_in);
      return true;
    } catch {
      clearAuthState({ clearActivity: true });
      return false;
    }
  }, [applyAccessToken, clearAuthState]);

  const login = useCallback((response: LoginResponse) => {
    if (!response?.access_token || !Number.isFinite(response?.expires_in)) {
      clearAuthState({ clearActivity: true });
      return;
    }
    touchLastActivity();
    applyAccessToken(response.access_token, response.expires_in, response.refresh_expires_in);
    // refreshMe will be called by useEffect when token changes
  }, [applyAccessToken, clearAuthState]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    return refreshAccessTokenInternal();
  }, [refreshAccessTokenInternal]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const legacyRefreshToken = localStorage.getItem('refresh_token') || undefined;
      clearLegacyTokenStorage();
      // The SSO callback route performs its own refresh-token exchange and login.
      // Running the normal bootstrap refresh here can race and wipe that state.
      if (isLoginCallbackPath(window.location.pathname)) {
        if (!cancelled) setIsAuthenticating(false);
        return;
      }
      if (isIdleExpired()) {
        clearAuthState({ clearActivity: true });
        if (!cancelled) setIsAuthenticating(false);
        return;
      }
      await refreshAccessTokenInternal(legacyRefreshToken);
      if (!cancelled) setIsAuthenticating(false);
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearAuthState, refreshAccessTokenInternal]);

  useEffect(() => {
    // When token changes (e.g., reload with stored token), fetch /auth/me
    if (token) void refreshMe();
  }, [token, refreshMe]);

  useEffect(() => {
    if (!profile) return;

    if (profile.locale) {
      try {
        localStorage.setItem(LANGUAGE_OVERRIDE_STORAGE_KEY, profile.locale);
      } catch {
        // Ignore localStorage failures
      }
      void i18n.changeLanguage(profile.locale);
      return;
    }

    if (profile.locale === null) {
      try {
        localStorage.removeItem(LANGUAGE_OVERRIDE_STORAGE_KEY);
      } catch {
        // Ignore localStorage failures
      }
      void i18n.changeLanguage(detectBrowserLocale());
    }
  }, [profile]);

  const hasLevel = (resource: string, level: PermissionLevel) => {
    if (claims?.isGlobalAdmin || claims?.isPlatformAdmin) return true;
    const map = claims?.permissions || {};
    // Support both 'member' (new) and 'manager' (legacy) - backend uses 'member' since RBAC overhaul
    const rank = { reader: 1, contributor: 2, member: 3, manager: 3, admin: 4 } as const;
    const current = map[resource as keyof typeof map] as PermissionLevel | undefined;
    if (!current) return false;
    return (rank[current] ?? 0) >= (rank[level] ?? 0);
  };

  const value = useMemo(
    () => ({ token, tokenExpiresAt, isAuthenticating, profile, claims, subscription, tenantAuth, login, logout, refreshMe, refreshAccessToken, hasLevel }),
    [token, tokenExpiresAt, isAuthenticating, profile, claims, subscription, tenantAuth, login, logout, refreshMe, refreshAccessToken, hasLevel]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
