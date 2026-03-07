import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { SessionManager } from './SessionManager';
import { AuthProvider } from './AuthContext';
import { getAccessToken, setAccessToken } from './accessTokenStore';
import LoginCallbackPage from '../pages/LoginCallbackPage';
import ProtectedRoute from '../components/ProtectedRoute';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../tenant/TenantContext', () => ({
  useTenant: () => ({
    isPlatformHost: false,
  }),
}));

vi.mock('../config/FeaturesContext', () => ({
  useFeatures: () => ({
    config: {
      features: {
        billing: true,
        sso: true,
        email: true,
      },
    },
  }),
}));

import api from '../api';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

function AppUnderTest() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/login/callback" element={<LoginCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>Home Page</div>} />
      </Route>
    </Routes>
  );
}

describe('Entra callback auth bootstrap race', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = createStorageMock();
    vi.stubGlobal('localStorage', storage);
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    setAccessToken(null);
    window.history.replaceState(null, '', '/');
  });

  it('can wipe callback auth state when startup refresh fails after callback login', async () => {
    const bootstrapRefresh = deferred<{ data: { access_token: string; expires_in: number; refresh_expires_in: number } }>();

    vi.mocked(api.post).mockImplementation((url: string, body?: any) => {
      if (url !== '/auth/refresh') {
        throw new Error(`Unexpected POST ${url}`);
      }

      if (body?.refresh_token) {
        return Promise.resolve({
          data: {
            access_token: 'callback-access-token',
            expires_in: 900,
            refresh_expires_in: 14400,
          },
        });
      }

      return bootstrapRefresh.promise;
    });

    vi.mocked(api.get).mockResolvedValue({
      data: {
        profile: {
          id: 'user-1',
          email: 'user@example.com',
        },
        claims: {
          isGlobalAdmin: true,
          isBillingAdmin: true,
          permissions: {},
        },
        subscription: null,
        tenantAuth: {
          sso_provider: 'entra',
          sso_enabled: true,
        },
      },
    } as any);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login/callback',
            hash: '#token=callback-token-from-fragment&refreshToken=fresh-refresh-token&expiresIn=900&refreshExpiresIn=14400&redirectTo=%2F',
          },
        ]}
      >
        <AuthProvider>
          <SessionManager>
            <AppUnderTest />
          </SessionManager>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAccessToken()).toBe('callback-access-token');
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');

    await act(async () => {
      bootstrapRefresh.reject(new Error('expired refresh token'));
    });

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    expect(getAccessToken()).toBeNull();
  });
});
