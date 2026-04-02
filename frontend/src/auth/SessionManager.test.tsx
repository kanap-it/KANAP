import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionManager } from './SessionManager';

const navigateMock = vi.fn();

const authState = {
  token: 'access-token',
  tokenExpiresAt: Date.now() + 60_000,
  refreshAccessToken: vi.fn<() => Promise<boolean>>(),
  logout: vi.fn<() => Promise<void>>(),
};

vi.mock('./AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SessionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T09:00:00Z'));
    vi.clearAllMocks();

    authState.token = 'access-token';
    authState.tokenExpiresAt = Date.now() + 60_000;
    authState.refreshAccessToken.mockResolvedValue(true);
    authState.logout.mockResolvedValue();

    const storage = createStorageMock({
      refresh_ttl_ms: String(4 * 60 * 60 * 1000),
    });
    vi.stubGlobal('localStorage', storage);
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('refreshes instead of logging out when the access token expires', async () => {
    authState.tokenExpiresAt = Date.now() + 1_000;

    render(
      <MemoryRouter initialEntries={['/']}>
        <SessionManager>
          <div>Child</div>
        </SessionManager>
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_001);
    });

    expect(authState.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authState.logout).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not log out while a refresh started by the warning timer is still in flight', async () => {
    const pendingRefresh = deferred<boolean>();
    authState.tokenExpiresAt = Date.now() + 61_000;
    authState.refreshAccessToken.mockImplementation(() => pendingRefresh.promise);

    render(
      <MemoryRouter initialEntries={['/']}>
        <SessionManager>
          <div>Child</div>
        </SessionManager>
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(authState.refreshAccessToken).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(authState.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authState.logout).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      pendingRefresh.resolve(true);
      await pendingRefresh.promise;
    });

    expect(authState.logout).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
