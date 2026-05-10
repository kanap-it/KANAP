import { Response } from 'express';
import { isProductionEnv } from '../common/env';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function isSecureRequest(req: any): boolean {
  if (isProductionEnv()) return true;
  if (req?.secure === true) return true;
  if (String(req?.protocol ?? '').toLowerCase() === 'https') return true;

  const forwardedProto = headerValue(req?.headers?.['x-forwarded-proto'])
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (forwardedProto === 'https') return true;

  const forwardedSsl = headerValue(req?.headers?.['x-forwarded-ssl']).trim().toLowerCase();
  if (forwardedSsl === 'on' || forwardedSsl === '1' || forwardedSsl === 'true') return true;

  const frontendHttps = headerValue(req?.headers?.['front-end-https']).trim().toLowerCase();
  return frontendHttps === 'on' || frontendHttps === '1' || frontendHttps === 'true';
}

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

export function clearRefreshTokenCookie(res: Response, requestSecure?: boolean): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProductionEnv() ? true : !!requestSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
