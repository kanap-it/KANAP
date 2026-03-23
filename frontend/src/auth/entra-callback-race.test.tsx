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
          aiChat: false,
          aiMcp: false,
          aiSettings: false,
          aiWebSearch: false,
        },
      },
    }),
}));

vi.mock('../ai/useAiCapabilities', () => ({
  useAiCapabilities: () => ({
    isLoading: false,
    isFetching: false,
    isError: false,
    data: {
      surfaces: {
        chat: { available: true },
        settings: { available: true },
      },
    },
  }),
}));

import api from '../api';

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

  it('skips bootstrap refresh on the callback route and preserves callback auth state', async () => {
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

      throw new Error('Bootstrap refresh should not run on the login callback route');
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

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'fresh-refresh-token' });
    expect(getAccessToken()).toBe('callback-access-token');
  });
});
