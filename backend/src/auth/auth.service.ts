import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { createPasswordResetToken as buildPasswordResetToken, getPasswordResetExpirationMinutes, getPasswordResetSecret } from './password-reset.util';
import { RefreshToken } from './refresh-token.entity';
import { requireJwtSecret } from '../common/env';

// Default token TTLs
const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const DEFAULT_REFRESH_TOKEN_TTL = '4h';

function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 15 * 60 * 1000; // default 15 minutes
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

function parseDurationSec(duration: string): number {
  return Math.floor(parseDurationMs(duration) / 1000);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string, manager?: import('typeorm').EntityManager) {
    if (!password || typeof password !== 'string') throw new UnauthorizedException('Invalid credentials');
    const user = await this.users.findByEmail(email, { manager });
    if (!user || !user.password_hash || typeof user.password_hash !== 'string') {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (process.env.APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('login attempt', {
        email,
        hasHash: !!user.password_hash,
        hashType: typeof user.password_hash,
        passType: typeof password,
      });
    }
    let ok = false;
    try {
      ok = await argon2.verify(user.password_hash as string, password);
    } catch {
      ok = false;
    }
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'enabled') throw new UnauthorizedException('User disabled');
    if (!user.role) throw new UnauthorizedException('User disabled');
    const roleName = (user.role.role_name ?? '').toLowerCase();
    const isSystemRole = !!user.role.is_system;
    const canLogin = roleName === 'administrator' || !isSystemRole;
    if (!canLogin) throw new UnauthorizedException('User disabled');
    return user;
  }

  /**
   * Sign both access token and refresh token for a user.
   * Access token: short-lived (default 15m)
   * Refresh token: longer-lived with sliding expiration (default 4h)
   */
  async signTokens(
    user: { id: string; email: string; role?: any; tenant_id?: string },
    manager?: import('typeorm').EntityManager,
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number }> {
    const secret = requireJwtSecret();
    const accessTtl = process.env.JWT_ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TOKEN_TTL;
    const refreshTtl = process.env.JWT_REFRESH_TOKEN_TTL || DEFAULT_REFRESH_TOKEN_TTL;

    const accessExpiresInSec = parseDurationSec(accessTtl);
    const refreshExpiresInSec = parseDurationSec(refreshTtl);
    const refreshExpiresInMs = parseDurationMs(refreshTtl);

    // Sign access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, secret, { expiresIn: accessExpiresInSec });

    // Generate refresh token (random bytes)
    const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(refreshTokenRaw);

    // Store refresh token in database
    const repo = manager ? manager.getRepository(RefreshToken) : this.refreshTokenRepo;
    const refreshTokenEntity = repo.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + refreshExpiresInMs),
      tenant_id: user.tenant_id || '',
    });
    await repo.save(refreshTokenEntity);

    return {
      access_token: accessToken,
      refresh_token: refreshTokenRaw,
      expires_in: accessExpiresInSec,
      refresh_expires_in: refreshExpiresInSec,
    };
  }

  /**
   * Legacy method for backwards compatibility (e.g., provisioning token exchange)
   */
  signToken(user: { id: string; email: string; role?: any }) {
    const secret = requireJwtSecret();
    const accessTtl = process.env.JWT_ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TOKEN_TTL;
    const accessExpiresInSec = parseDurationSec(accessTtl);
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, secret, { expiresIn: accessExpiresInSec });
    return { access_token: token };
  }

  /**
   * Refresh an access token using a valid refresh token.
   * Extends the refresh token's expiration (sliding window).
   */
  async refreshAccessToken(
    refreshToken: string,
    manager?: import('typeorm').EntityManager,
  ): Promise<{ access_token: string; expires_in: number; refresh_expires_in: number }> {
    const tokenHash = hashToken(refreshToken);
    const repo = manager ? manager.getRepository(RefreshToken) : this.refreshTokenRepo;

    const storedToken = await repo.findOne({
      where: { token_hash: tokenHash },
      relations: ['user', 'user.role'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expires_at < new Date()) {
      // Token expired, delete it
      await repo.delete({ id: storedToken.id });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Extend refresh token expiration (sliding window)
    const refreshTtl = process.env.JWT_REFRESH_TOKEN_TTL || DEFAULT_REFRESH_TOKEN_TTL;
    const refreshExpiresInMs = parseDurationMs(refreshTtl);
    const refreshExpiresInSec = parseDurationSec(refreshTtl);
    storedToken.expires_at = new Date(Date.now() + refreshExpiresInMs);
    await repo.save(storedToken);

    // Generate new access token
    const secret = requireJwtSecret();
    const accessTtl = process.env.JWT_ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TOKEN_TTL;
    const accessExpiresInSec = parseDurationSec(accessTtl);

    const user = storedToken.user;
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, secret, { expiresIn: accessExpiresInSec });

    return {
      access_token: accessToken,
      expires_in: accessExpiresInSec,
      refresh_expires_in: refreshExpiresInSec,
    };
  }

  /**
   * Revoke a specific refresh token (logout from one device).
   */
  async revokeToken(refreshToken: string, manager?: import('typeorm').EntityManager): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const repo = manager ? manager.getRepository(RefreshToken) : this.refreshTokenRepo;
    await repo.delete({ token_hash: tokenHash });
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices).
   */
  async revokeAllTokens(userId: string, manager?: import('typeorm').EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(RefreshToken) : this.refreshTokenRepo;
    await repo.delete({ user_id: userId });
  }

  /**
   * Clean up expired refresh tokens (can be run periodically).
   */
  async cleanupExpiredTokens(manager?: import('typeorm').EntityManager): Promise<number> {
    const repo = manager ? manager.getRepository(RefreshToken) : this.refreshTokenRepo;
    const result = await repo.delete({ expires_at: LessThan(new Date()) });
    return result.affected || 0;
  }

  createPasswordResetToken(user: { id: string; email: string; tenant_id?: string }) {
    return buildPasswordResetToken(user);
  }

  async resetPasswordWithToken(token: string, nextPassword: string, opts?: { manager?: import('typeorm').EntityManager }) {
    const secret = getPasswordResetSecret();
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new BadRequestException('invalid or expired token');
    }
    if (!payload || payload.purpose !== 'password-reset' || !payload.sub) {
      throw new BadRequestException('invalid token payload');
    }
    const user = await this.users.findById(payload.sub, { manager: opts?.manager });
    if (!user) {
      throw new BadRequestException('user cannot reset password');
    }
    const roleName = (user.role?.role_name ?? '').toLowerCase();
    const isContactRole = roleName === 'contact';
    const allowedStatuses = new Set(['enabled', 'invited']);
    if (isContactRole || !allowedStatuses.has(user.status)) {
      throw new BadRequestException('user cannot reset password');
    }
    await this.users.updateUser(user.id, { password: nextPassword }, null, { manager: opts?.manager });
    if (user.status !== 'enabled') {
      await this.users.enableUser(user.id, null, { manager: opts?.manager });
    }
  }

  getPasswordResetExpirationMinutes() {
    return getPasswordResetExpirationMinutes();
  }
}
