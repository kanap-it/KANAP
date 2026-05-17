import type { Location } from 'react-router-dom';

type RedirectLocationState = {
  from?: Partial<Pick<Location, 'pathname' | 'search' | 'hash'>> | string | null;
};

function isAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/accept-invite'
  );
}

export function sanitizeLoginRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;

  const raw = value.trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || isAuthPath(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function getLoginRedirectFromState(state: unknown, fallback = '/'): string {
  const from = (state as RedirectLocationState | null | undefined)?.from;
  if (typeof from === 'string') {
    return sanitizeLoginRedirect(from, fallback);
  }
  if (from && typeof from === 'object') {
    return sanitizeLoginRedirect(
      `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}`,
      fallback,
    );
  }
  return fallback;
}

export function getLoginRedirectPath(
  state: unknown,
  searchParams?: URLSearchParams,
  fallback = '/',
): string {
  const stateRedirect = getLoginRedirectFromState(state, '');
  if (stateRedirect) return stateRedirect;

  return sanitizeLoginRedirect(searchParams?.get('redirectTo'), fallback);
}

export function getCurrentRedirectPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  return sanitizeLoginRedirect(`${location.pathname}${location.search}${location.hash}`);
}
