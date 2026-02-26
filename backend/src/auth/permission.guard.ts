import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { REQUIRE_LEVEL_KEY, RequireLevelMeta } from './require-level.decorator';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UserRole } from '../users/user-role.entity';
import { StripeConfigService } from '../billing/stripe/stripe.config';
import { Subscription, SubscriptionStatus, CollectionMethod } from '../billing/subscription.entity';
import { FREEZE_GRACE_DAYS } from '../billing/plans.config';
import { isPlatformAdmin } from './platform-admin.util';

const RANK: Record<string, number> = { reader: 1, contributor: 2, member: 3, admin: 4 };

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
    private readonly perms: PermissionsService,
    private readonly dataSource: DataSource,
    private readonly stripeConfig: StripeConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RequireLevelMeta | undefined>(REQUIRE_LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true; // no requirement specified

    const req = context.switchToHttp().getRequest();
    const userJwt = req.user as { sub?: string; email?: string; role?: string } | undefined;
    if (!userJwt?.sub) return false;

    const manager = (req as any)?.queryRunner?.manager ?? this.dataSource.manager;
    const user = await this.users.findById(userJwt.sub, { manager });
    if (!user) return false;

    // Load all roles for this user (multi-role support)
    const userRolesRepo = manager.getRepository(UserRole);
    const userRoles = await userRolesRepo.find({
      where: { user_id: user.id },
      relations: ['role'],
    });

    // Collect all role IDs (include legacy role_id for backwards compatibility)
    const roleIds = new Set<string>();
    if (user.role_id) roleIds.add(user.role_id);
    for (const ur of userRoles) roleIds.add(ur.role_id);

    // Check if any role is Administrator
    const roleNames = userRoles.map(ur => ur.role?.role_name?.toLowerCase() ?? '');
    if (user.role?.role_name) roleNames.push(user.role.role_name.toLowerCase());
    const isAdmin = roleNames.includes('administrator');

    let currentLevel: string | undefined = isAdmin ? 'admin' : undefined;

    // If not administrator, check role-based permissions
    if (!isAdmin) {
      const map = await this.perms.listForRoles(Array.from(roleIds), { manager });
      const current = map.get(meta.resource);
      if (!current) return false;
      if ((RANK[current] ?? 0) < (RANK[meta.level] ?? 99)) return false;
      currentLevel = current;
    }

    req.isAdmin = isAdmin;
    req.permissionLevel = currentLevel;

    // --- Freeze enforcement ---
    await this.enforceFreezeIfNeeded(context, req, user, meta, manager);

    return true;
  }

  private async enforceFreezeIfNeeded(
    context: ExecutionContext,
    req: any,
    user: any,
    meta: RequireLevelMeta,
    manager: DataSource['manager'],
  ): Promise<void> {
    // Skip freeze entirely if Stripe is not configured (on-prem bypass)
    if (!this.stripeConfig.isConfigured()) return;

    // Skip for read-only methods
    const method = req.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

    // Skip for platform host requests
    if (req.isPlatformHost) return;

    // Skip for billing resource routes
    if (meta.resource === 'billing') return;

    // Skip for platform admin users
    if (isPlatformAdmin(user)) return;

    // Load tenant subscription
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new ForbiddenException({ error: 'SUBSCRIPTION_FROZEN', message: 'No active subscription found.' });
    }

    const subscription = await manager.getRepository(Subscription).findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    if (!subscription) {
      throw new ForbiddenException({ error: 'SUBSCRIPTION_FROZEN', message: 'No active subscription found.' });
    }

    const now = Date.now();

    switch (subscription.status) {
      case SubscriptionStatus.TRIALING: {
        if (subscription.trial_end && subscription.trial_end.getTime() > now) {
          return; // trial still active
        }
        throw new ForbiddenException({
          error: 'TRIAL_EXPIRED',
          message: 'Your trial has expired. Please choose a plan to continue.',
        });
      }

      case SubscriptionStatus.ACTIVE:
        return; // all good

      case SubscriptionStatus.PAST_DUE: {
        const freezeEffectiveAt = this.computeFreezeEffectiveAt(subscription);
        if (freezeEffectiveAt && now < freezeEffectiveAt) {
          return; // still within grace period
        }
        throw new ForbiddenException({
          error: 'SUBSCRIPTION_FROZEN',
          message: 'Your subscription is frozen due to an overdue payment.',
        });
      }

      default:
        throw new ForbiddenException({
          error: 'SUBSCRIPTION_FROZEN',
          message: 'Your subscription is not active.',
        });
    }
  }

  private computeFreezeEffectiveAt(subscription: Subscription): number | null {
    const graceDays = FREEZE_GRACE_DAYS * 86400000;

    if (subscription.collection_method === CollectionMethod.SEND_INVOICE) {
      // For invoice-based: (latest_invoice_created + days_until_due) + grace days
      if (subscription.latest_invoice_created && subscription.days_until_due != null) {
        const invoiceDueAt = subscription.latest_invoice_created.getTime()
          + subscription.days_until_due * 86400000;
        return invoiceDueAt + graceDays;
      }
      // Fallback: current_period_end + grace days
      if (subscription.current_period_end) {
        return subscription.current_period_end.getTime() + graceDays;
      }
      return null;
    }

    // charge_automatically (default): current_period_end + grace days
    if (subscription.current_period_end) {
      return subscription.current_period_end.getTime() + graceDays;
    }
    return null;
  }
}
