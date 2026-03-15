import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

@Injectable()
export class TenantInitGuard implements CanActivate {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req: any = context.switchToHttp().getRequest();
    const tenantId: string | undefined = req?.tenant?.id;
    if (!tenantId) return true; // public/apex requests

    // Create QueryRunner and set tenant context BEFORE other guards run.
    // This is required for PermissionGuard to query role_permissions with proper RLS context.
    if (!req.queryRunner) {
      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
      req.queryRunner = runner;
      req._tenantRunnerOwner = true; // Mark that this guard owns the runner
    }

    return true;
  }
}
