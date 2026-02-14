import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clearSessionActivity, isIdleExpired, setRefreshTtlMs } from '../auth/sessionStorage';
import { getAccessToken, setAccessToken } from '../auth/accessTokenStore';

/**
 * Paginated response from the API
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Request parameters for paginated requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
  filters?: string;
  [key: string]: unknown;
}

/**
 * API error response structure
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Type-safe API client wrapper around Axios
 */
export class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      withCredentials: true,
    });
    this.setupInterceptors();
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns the new access token or null if refresh failed.
   */
  private async attemptTokenRefresh(): Promise<string | null> {
    if (isIdleExpired()) {
      clearSessionActivity();
      return null;
    }

    try {
      // Use a fresh axios instance to avoid interceptor loops
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const { access_token, refresh_expires_in } = response.data;
      setAccessToken(access_token);
      if (refresh_expires_in) {
        setRefreshTtlMs(refresh_expires_in * 1000);
      }
      return access_token;
    } catch {
      // Refresh failed - clear access token and session activity markers
      setAccessToken(null);
      clearSessionActivity();
      return null;
    }
  }

  /**
   * Configure request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for auth token
    this.instance.interceptors.request.use((config) => {
      const token = getAccessToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling with token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle billing-specific 403 errors
        if (error.response?.status === 403) {
          const errorCode = error.response.data?.error;
          if (errorCode === 'SUBSCRIPTION_FROZEN' || errorCode === 'TRIAL_EXPIRED') {
            // Don't redirect — let the ProtectedRoute/SubscriptionBanner handle it
            // Just reject with a structured error so components can react
            return Promise.reject(error);
          }
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Don't retry refresh endpoint itself
          if (originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          // If already refreshing, wait for that to complete
          if (this.isRefreshing) {
            try {
              const newToken = await this.refreshPromise;
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.instance(originalRequest);
              }
            } catch {
              // Refresh failed
            }
          } else {
            // Start refresh process
            this.isRefreshing = true;
            this.refreshPromise = this.attemptTokenRefresh();

            try {
              const newToken = await this.refreshPromise;
              this.isRefreshing = false;
              this.refreshPromise = null;

              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.instance(originalRequest);
              }
            } catch {
              this.isRefreshing = false;
              this.refreshPromise = null;
            }
          }

          // Token refresh failed - redirect to login
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login')) {
            setAccessToken(null);
            clearSessionActivity();
            window.location.href = '/login?sessionExpired=true';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request with typed response
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.get(url, config);
    return response.data;
  }

  /**
   * POST request with typed request and response
   */
  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.post(url, data, config);
    return response.data;
  }

  /**
   * PUT request with typed request and response
   */
  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.put(url, data, config);
    return response.data;
  }

  /**
   * PATCH request with typed request and response
   */
  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.patch(url, data, config);
    return response.data;
  }

  /**
   * DELETE request with typed response
   */
  async delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.delete(url, config);
    return response.data;
  }

  /**
   * GET request specifically for paginated endpoints
   */
  async paginated<T>(url: string, params?: PaginationParams): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(url, { params });
  }

  /**
   * Get the underlying Axios instance for advanced use cases
   * (e.g., custom interceptors, direct access to request/response objects)
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

// Default base URL from environment or fallback
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Singleton API client instance
export const api = new ApiClient(baseURL);

// Export type utilities for endpoint definitions
export type { AxiosRequestConfig };
