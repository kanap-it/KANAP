import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EntityManager, QueryRunner } from 'typeorm';

/**
 * Typed request context for tenant-aware operations.
 * Replaces the need to use `@Req() req: any` in controllers.
 */
export interface TenantRequest {
  /** The tenant ID from the resolved subdomain */
  tenantId: string;
  /** The authenticated user's ID (from JWT sub claim) */
  userId: string;
  /** The user's role names */
  userRoles: string[];
  /** The TypeORM query runner with tenant context bound */
  queryRunner?: QueryRunner;
  /** The EntityManager from the query runner (convenience accessor) */
  manager?: EntityManager;
}

/**
 * Partial tenant context for routes that may not have full authentication.
 */
export interface PartialTenantRequest {
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
  queryRunner?: QueryRunner;
  manager?: EntityManager;
}

/**
 * @Tenant() decorator to extract tenant context from the request.
 *
 * Replaces the pattern of `@Req() req: any` with a typed interface.
 *
 * Usage:
 * ```typescript
 * @Get()
 * list(@Tenant() ctx: TenantRequest) {
 *   return this.svc.list({ manager: ctx.manager });
 * }
 *
 * @Post()
 * create(@Body() body: CreateDto, @Tenant() ctx: TenantRequest) {
 *   return this.svc.create(body, ctx.tenantId, ctx.userId, { manager: ctx.manager });
 * }
 * ```
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantRequest => {
    const request = ctx.switchToHttp().getRequest();

    const tenantId: string = request?.tenant?.id ?? '';
    const userId: string = request?.user?.sub ?? '';
    const userRoles: string[] = Array.isArray(request?.user?.roles)
      ? request.user.roles
      : request?.user?.role
        ? [request.user.role]
        : [];

    const queryRunner: QueryRunner | undefined = request?.queryRunner;
    const manager: EntityManager | undefined = queryRunner?.manager;

    return {
      tenantId,
      userId,
      userRoles,
      queryRunner,
      manager,
    };
  },
);

/**
 * @PartialTenant() decorator for routes that may not require full authentication.
 * Returns undefined values instead of empty strings when context is not available.
 */
export const PartialTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PartialTenantRequest => {
    const request = ctx.switchToHttp().getRequest();

    const tenantId: string | undefined = request?.tenant?.id;
    const userId: string | undefined = request?.user?.sub;
    const userRoles: string[] | undefined = Array.isArray(request?.user?.roles)
      ? request.user.roles
      : request?.user?.role
        ? [request.user.role]
        : undefined;

    const queryRunner: QueryRunner | undefined = request?.queryRunner;
    const manager: EntityManager | undefined = queryRunner?.manager;

    return {
      tenantId,
      userId,
      userRoles,
      queryRunner,
      manager,
    };
  },
);
