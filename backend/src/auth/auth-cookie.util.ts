import { Response } from 'express';
import { isProductionEnv } from '../common/env';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export function parseCookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (!k || rest.length === 0) continue;
    if (k.trim() !== name) continue;
    try {
      return decodeURIComponent(rest.join('=').trim());
    } catch {
      return rest.join('=').trim();
    }
  }
  return undefined;
}

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  refreshExpiresInSeconds?: number,
  requestSecure?: boolean,
): void {
  const maxAge = (
    typeof refreshExpiresInSeconds === 'number'
    && Number.isFinite(refreshExpiresInSeconds)
    && refreshExpiresInSeconds > 0
  )
    ? Math.floor(refreshExpiresInSeconds * 1000)
    : undefined;

  // In production, always force Secure cookies.
  // In non-production, honor request security when available.
  const secure = isProductionEnv() ? true : !!requestSecure;

  const options: Record<string, any> = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, options);
}

export function clearRefreshTokenCookie(res: Response): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
