import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { clearSessionActivity, isIdleExpired, setRefreshTtlMs } from './auth/sessionStorage';
import { getAccessToken, setAccessToken } from './auth/accessTokenStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

type RefreshResponse = {
  access_token: string;
  expires_in: number;
  refresh_expires_in?: number;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise: Promise<RefreshResponse | null> | null = null;

function clearAuthSession(): void {
  setAccessToken(null);
  clearSessionActivity();
}

function applyRefreshResponse(data: RefreshResponse): RefreshResponse | null {
  if (!data?.access_token || !Number.isFinite(data?.expires_in)) {
    clearAuthSession();
    return null;
  }

  if (isIdleExpired()) {
    clearAuthSession();
    return null;
  }

  setAccessToken(data.access_token, Date.now() + data.expires_in * 1000);
  if (data.refresh_expires_in) {
    setRefreshTtlMs(data.refresh_expires_in * 1000);
  }
  return data;
}

async function performTokenRefresh(body?: { refresh_token?: string }): Promise<RefreshResponse | null> {
  if (isIdleExpired()) {
    clearAuthSession();
    return null;
  }

  try {
    const response = await axios.post<RefreshResponse>(`${baseURL}/auth/refresh`, body ?? {}, {
      withCredentials: true,
    });
    return applyRefreshResponse(response.data);
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function requestTokenRefresh(body?: { refresh_token?: string }): Promise<RefreshResponse | null> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh(body).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as RetryableRequestConfig | undefined;
    if (error?.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshed = await requestTokenRefresh();
    if (!refreshed) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers || {};
    (originalRequest.headers as any).Authorization = `Bearer ${refreshed.access_token}`;

    return api.request(originalRequest as AxiosRequestConfig);
  },
);

export default api;
