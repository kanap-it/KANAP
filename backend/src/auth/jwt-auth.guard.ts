import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './public.decorator';
import { requireJwtSecret } from '../common/env';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'] as string | undefined;
    if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = header.slice('Bearer '.length);
    try {
      const secret = requireJwtSecret();
      const verified = jwt.verify(token, secret);
      if (!verified || typeof verified === 'string') {
        throw new UnauthorizedException('Invalid token');
      }

      const payload = verified as Record<string, unknown>;
      const requestTenantId = typeof req?.tenant?.id === 'string' ? req.tenant.id : undefined;
      const payloadTenantId = typeof payload.tenant_id === 'string' ? payload.tenant_id : undefined;

      if (!req?.isPlatformHost && requestTenantId && payloadTenantId !== requestTenantId) {
        throw new UnauthorizedException('Invalid token');
      }

      req.user = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid token');
    }
  }
}
