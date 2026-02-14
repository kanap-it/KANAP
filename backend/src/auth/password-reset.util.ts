import type { StringValue } from 'ms';
import * as jwt from 'jsonwebtoken';
import { requireJwtSecret } from '../common/env';

const DEFAULT_TTL: StringValue | number = '1h';

export type PasswordResetTokenPayload = {
  purpose: 'password-reset';
  sub: string;
  email: string;
  tenant_id?: string | null;
};

export function getPasswordResetSecret() {
  return process.env.PASSWORD_RESET_SECRET || requireJwtSecret();
}

export function getPasswordResetTtl(): StringValue | number {
  const raw = process.env.PASSWORD_RESET_TTL;
  if (!raw) return DEFAULT_TTL;
  const trimmed = raw.trim();
  if (trimmed === '') return DEFAULT_TTL;
  const num = Number(trimmed);
  if (!Number.isNaN(num) && num > 0) return num;
  return trimmed as StringValue;
}

export function getPasswordResetExpirationMinutes() {
  const ttl = getPasswordResetTtl();
  if (typeof ttl === 'number') {
    return Math.max(1, Math.round(ttl / 60));
  }
  const normalized = ttl.trim().toLowerCase();
  if (normalized.endsWith('h')) {
    const hours = Number(normalized.slice(0, -1));
    return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 60;
  }
  if (normalized.endsWith('m')) {
    const minutes = Number(normalized.slice(0, -1));
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 60;
  }
  const seconds = Number(normalized);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.max(1, Math.round(seconds / 60));
  }
  return 60;
}

export function createPasswordResetToken(user: { id: string; email: string; tenant_id?: string | null }) {
  const secret = getPasswordResetSecret();
  const payload: PasswordResetTokenPayload = {
    purpose: 'password-reset',
    sub: user.id,
    email: user.email,
    tenant_id: user.tenant_id ?? null,
  };
  const expiresIn = getPasswordResetTtl();
  return jwt.sign(payload, secret, { expiresIn });
}
