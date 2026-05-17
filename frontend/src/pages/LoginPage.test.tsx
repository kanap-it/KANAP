import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import LoginPage from './LoginPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    login: mocks.login,
  }),
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
        sso: false,
        email: false,
      },
    },
  }),
}));

vi.mock('../components/AuthFrame', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'auth:login.emailLabel': 'Username or email',
        'auth:login.passwordLabel': 'Password',
        'auth:login.submit': 'Sign in with email',
      };
      return labels[key] ?? key;
    },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <span>Destination page</span>
      <span data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</span>
    </div>
  );
}

type TestInitialEntry = string | {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

function renderLogin(initialEntry: TestInitialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portfolio/tasks/:id" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({
      data: {
        access_token: 'access-token',
        expires_in: 900,
        refresh_expires_in: 14_400,
      },
    } as any);
  });

  it('redirects to the originally requested protected link after email login', async () => {
    renderLogin({
      pathname: '/login',
      state: {
        from: {
          pathname: '/portfolio/tasks/42',
          search: '?focus=activity',
          hash: '#comments',
        },
      },
    });

    fireEvent.change(screen.getByLabelText('Username or email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct horse battery staple' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        access_token: 'access-token',
        expires_in: 900,
        refresh_expires_in: 14_400,
      });
    });

    expect(await screen.findByText('Destination page')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/portfolio/tasks/42?focus=activity#comments',
    );
  });
});
