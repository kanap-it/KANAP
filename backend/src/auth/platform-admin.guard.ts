import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { isPlatformAdmin } from './platform-admin.util';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: any = context.switchToHttp().getRequest();
    const user = req?.user as { email?: string; role?: { role_name?: string } } | undefined;
    if (!user) throw new UnauthorizedException('Authentication required');
    const platformHostConfigured = (process.env.PLATFORM_ADMIN_HOST || '').trim().length > 0;
    if (platformHostConfigured && !req?.isPlatformHost) {
      throw new ForbiddenException('Platform admin host required');
    }
    if (!isPlatformAdmin(user)) {
      throw new ForbiddenException('Platform admin access required');
    }
    return true;
  }
}
