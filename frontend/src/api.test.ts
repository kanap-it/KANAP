import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createAxiosMock() {
  const requestHandlers: Array<(config: any) => any> = [];
  const responseErrorHandlers: Array<(error: any) => Promise<unknown>> = [];

  const apiInstance = {
    interceptors: {
      request: {
        use: vi.fn((handler: (config: any) => any) => {
          requestHandlers.push(handler);
          return 0;
        }),
      },
      response: {
        use: vi.fn((_success: (value: any) => any, error: (value: any) => Promise<unknown>) => {
          responseErrorHandlers.push(error);
          return 0;
        }),
      },
    },
    request: vi.fn(),
  };

  const axiosMock = {
    create: vi.fn(() => apiInstance),
    post: vi.fn(),
  };

  return { axiosMock, apiInstance, requestHandlers, responseErrorHandlers };
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

describe('api auth recovery', () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = createStorageMock();
    vi.stubGlobal('localStorage', storage);
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes and retries protected requests after a 401 response', async () => {
    const { axiosMock, apiInstance, responseErrorHandlers } = createAxiosMock();

    vi.doMock('axios', () => ({
      __esModule: true,
      default: axiosMock,
    }));

    const { getAccessToken, setAccessToken } = await import('./auth/accessTokenStore');
    const { api } = await import('./api');

    setAccessToken('stale-access-token', Date.now() + 1_000);

    axiosMock.post.mockResolvedValue({
      data: {
        access_token: 'fresh-access-token',
        expires_in: 900,
        refresh_expires_in: 14_400,
      },
    });
    apiInstance.request.mockResolvedValue({ data: { ok: true } });

    const result = await responseErrorHandlers[0]({
      response: { status: 401 },
      config: {
        url: '/master-data/companies',
        headers: {},
      },
    });

    expect(api).toBe(apiInstance);
    expect(axiosMock.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/refresh',
      {},
      { withCredentials: true },
    );
    expect(apiInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/master-data/companies',
        _retry: true,
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-access-token',
        }),
      }),
    );
    expect(getAccessToken()).toBe('fresh-access-token');
    expect(result).toEqual({ data: { ok: true } });
  });
});
