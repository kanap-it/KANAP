import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { isPlatformAdmin } from '../auth/platform-admin.util';
import { throwFeatureDisabled } from '../common/feature-gates';
import { StripeConfigService } from '../billing/stripe';
import { FREEZE_GRACE_DAYS } from '../billing/plans.config';
import { CollectionMethod, Subscription, SubscriptionStatus } from '../billing/subscription.entity';
import { Features } from '../config/features';
import { PermissionLevel, PermissionsService } from '../permissions/permissions.service';
import { Tenant, TenantStatus } from '../tenants/tenant.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.entity';
import { AiSettingsService } from './ai-settings.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import {
  AiCapabilitiesDto,
  AiContextEntityType,
  AiExecutionContext,
  AiSearchEntityType,
  AiSettingsCapabilityDto,
  AiSurface,
  AiSurfaceCapabilityDto,
} from './ai.types';

const LEVEL_RANK: Record<PermissionLevel, number> = {
  reader: 1,
  contributor: 2,
  member: 3,
  admin: 4,
};

const SURFACE_RESOURCE: Record<AiSurface, 'ai_chat' | 'ai_mcp'> = {
  chat: 'ai_chat',
  mcp: 'ai_mcp',
};

const ENTITY_RESOURCE: Record<AiSearchEntityType | AiContextEntityType, string> = {
  applications: 'applications',
  assets: 'infrastructure',
  companies: 'companies',
  contracts: 'contracts',
  departments: 'departments',
  locations: 'locations',
  projects: 'portfolio_projects',
  requests: 'portfolio_requests',
  spend_items: 'opex',
  suppliers: 'suppliers',
  tasks: 'tasks',
  users: 'users',
  documents: 'knowledge',
};

type EffectivePermissionState = {
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  permissions: Map<string, PermissionLevel>;
};

type AiPolicyAccessContext = Pick<AiExecutionContext, 'tenantId' | 'userId' | 'isPlatformHost'>;

@Injectable()
export class AiPolicyService {
  private readonly logger = new Logger(AiPolicyService.name);

  constructor(
    private readonly users: UsersService,
    private readonly permissions: PermissionsService,
    private readonly aiSettings: AiSettingsService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly stripeConfig: StripeConfigService,
  ) {}

  private async getEffectivePermissionStateOrNull(
    userId: string,
    manager: EntityManager,
  ): Promise<EffectivePermissionState | null> {
    const user = await this.users.findById(userId, { manager });
    if (!user || user.status !== 'enabled') {
      return null;
    }

    const roleName = (user.role?.role_name ?? '').toLowerCase();
    if (user.role?.is_system && roleName !== 'administrator') {
      return null;
    }

    const userRoles = await manager.getRepository(UserRole).find({
      where: { user_id: user.id },
      relations: ['role'],
    });

    const roleIds = new Set<string>();
    if (user.role_id) roleIds.add(user.role_id);
    for (const userRole of userRoles) {
      roleIds.add(userRole.role_id);
    }

    const roleNames = userRoles.map((userRole) => userRole.role?.role_name?.toLowerCase() ?? '');
    if (user.role?.role_name) {
      roleNames.push(user.role.role_name.toLowerCase());
    }

    const isAdmin = roleNames.includes('administrator');
    return {
      isAdmin,
      isPlatformAdmin: isPlatformAdmin(user),
      permissions: isAdmin ? new Map() : await this.permissions.listForRoles(Array.from(roleIds), { manager }),
    };
  }

  private async getEffectivePermissionState(
    userId: string,
    manager: EntityManager,
  ): Promise<EffectivePermissionState> {
    const state = await this.getEffectivePermissionStateOrNull(userId, manager);
    if (!state) {
      throw new ForbiddenException('User is not allowed to use AI.');
    }
    return state;
  }

  private hasPermission(
    state: EffectivePermissionState | null,
    resource: string,
    minimumLevel: PermissionLevel,
  ): boolean {
    if (!state) return false;
    if (state.isAdmin || state.isPlatformAdmin) {
      return true;
    }

    const current = state.permissions.get(resource);
    if (!current) return false;
    return (LEVEL_RANK[current] ?? 0) >= (LEVEL_RANK[minimumLevel] ?? 0);
  }

  private assertPlatformHostAllowed(context: Pick<AiExecutionContext, 'isPlatformHost'>): void {
    if (context.isPlatformHost) {
      throw new ForbiddenException('AI is not available on the platform host.');
    }
  }

  private getSurfaceFeature(surface: AiSurface): boolean {
    switch (surface) {
      case 'chat':
        return Features.AI_CHAT_ENABLED;
      case 'mcp':
        return Features.AI_MCP_ENABLED;
      default:
        return false;
    }
  }

  private async assertTenantAvailable(tenantId: string, manager: EntityManager): Promise<void> {
    const tenant = await manager.getRepository(Tenant).findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new ForbiddenException('Tenant not found.');
    }
    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException('AI is not available for this tenant while it is inactive.');
    }
  }

  private async assertUserPermission(
    userId: string,
    resource: string,
    minimumLevel: PermissionLevel,
    manager: EntityManager,
  ): Promise<void> {
    const state = await this.getEffectivePermissionState(userId, manager);
    if (state.isAdmin || state.isPlatformAdmin) {
      return;
    }

    const current = state.permissions.get(resource);
    if (!current || (LEVEL_RANK[current] ?? 0) < (LEVEL_RANK[minimumLevel] ?? 0)) {
      throw new ForbiddenException(`Missing required permission ${resource}:${minimumLevel}.`);
    }
  }

  async canReadKnowledge(context: AiExecutionContext, manager: EntityManager): Promise<boolean> {
    try {
      await this.assertUserPermission(context.userId, 'knowledge', 'reader', manager);
      return true;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) {
        this.logger.warn(
          `Unexpected error while probing knowledge read access for user ${context.userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return false;
    }
  }

  async getCapabilities(
    context: AiPolicyAccessContext,
    manager: EntityManager,
  ): Promise<AiCapabilitiesDto> {
    this.assertPlatformHostAllowed(context);
    const state = await this.getEffectivePermissionStateOrNull(context.userId, manager);
    const tenant = await manager.getRepository(Tenant).findOne({
      where: { id: context.tenantId },
    });
    const tenantActive = !!tenant && tenant.status === TenantStatus.ACTIVE;
    const settings = tenant ? await this.aiSettings.find(context.tenantId, { manager }) : null;
    const providerErrors = this.providerRegistry.validate({
      llm_provider: settings?.llm_provider ?? null,
      llm_model: settings?.llm_model ?? null,
      llm_endpoint_url: settings?.llm_endpoint_url ?? null,
      has_llm_api_key: !!settings?.llm_api_key_encrypted,
    });

    const buildSurfaceCapability = (
      surface: AiSurface,
      opts: {
        tenantEnabled: boolean;
        permissionGranted: boolean;
        providerReady?: boolean;
      },
    ): AiSurfaceCapabilityDto => {
      const reasons: string[] = [];
      const featureEnabled = this.getSurfaceFeature(surface);
      const providerReady = opts.providerReady ?? true;

      if (!featureEnabled) reasons.push('feature_disabled');
      if (!tenant) reasons.push('tenant_not_found');
      if (tenant && !tenantActive) reasons.push('tenant_inactive');
      if (!opts.tenantEnabled) reasons.push('tenant_disabled');
      if (!providerReady) reasons.push('provider_not_ready');
      if (!state) reasons.push('user_not_allowed');
      if (!opts.permissionGranted) reasons.push('permission_denied');

      return {
        feature_enabled: featureEnabled,
        tenant_enabled: opts.tenantEnabled,
        permission_granted: opts.permissionGranted,
        provider_ready: providerReady,
        available: reasons.length === 0,
        reasons,
      };
    };

    const buildSettingsCapability = (
      permissionGranted: boolean,
    ): AiSettingsCapabilityDto => {
      const reasons: string[] = [];
      if (!Features.AI_SETTINGS_ENABLED) reasons.push('feature_disabled');
      if (!tenant) reasons.push('tenant_not_found');
      if (tenant && !tenantActive) reasons.push('tenant_inactive');
      if (!state) reasons.push('user_not_allowed');
      if (!permissionGranted) reasons.push('permission_denied');

      return {
        feature_enabled: Features.AI_SETTINGS_ENABLED,
        permission_granted: permissionGranted,
        available: reasons.length === 0,
        reasons,
      };
    };

    return {
      instance_features: {
        ai_chat: Features.AI_CHAT_ENABLED,
        ai_mcp: Features.AI_MCP_ENABLED,
        ai_settings: Features.AI_SETTINGS_ENABLED,
        ai_web_search: Features.AI_WEB_SEARCH_READY,
      },
      surfaces: {
        chat: buildSurfaceCapability('chat', {
          tenantEnabled: settings?.chat_enabled === true,
          permissionGranted: this.hasPermission(state, 'ai_chat', 'reader'),
          providerReady: providerErrors.length === 0,
        }),
        mcp: buildSurfaceCapability('mcp', {
          tenantEnabled: settings?.mcp_enabled === true,
          permissionGranted: this.hasPermission(state, 'ai_mcp', 'reader'),
        }),
        settings: buildSettingsCapability(
          this.hasPermission(state, 'ai_settings', 'admin'),
        ),
      },
    };
  }

  async assertSurfaceAccess(context: AiExecutionContext, manager: EntityManager): Promise<void> {
    this.assertPlatformHostAllowed(context);

    if (!this.getSurfaceFeature(context.surface)) {
      throwFeatureDisabled(SURFACE_RESOURCE[context.surface]);
    }

    await this.assertTenantAvailable(context.tenantId, manager);

    const settings = await this.aiSettings.get(context.tenantId, { manager });
    if (context.surface === 'chat') {
      if (!settings.chat_enabled) {
        throw new ForbiddenException('AI chat is disabled for this tenant.');
      }
      const providerErrors = this.providerRegistry.validate(this.aiSettings.toProviderSnapshot(settings));
      if (providerErrors.length > 0) {
        throw new ForbiddenException('AI chat is not fully configured for this tenant.');
      }
    }
    if (context.surface === 'mcp' && !settings.mcp_enabled) {
      throw new ForbiddenException('AI MCP access is disabled for this tenant.');
    }

    await this.assertUserPermission(context.userId, SURFACE_RESOURCE[context.surface], 'reader', manager);
  }

  async assertKeyManagementAccess(
    context: AiPolicyAccessContext,
    manager: EntityManager,
  ): Promise<void> {
    this.assertPlatformHostAllowed(context);

    if (!Features.AI_MCP_ENABLED) {
      throwFeatureDisabled('ai_mcp');
    }

    await this.assertTenantAvailable(context.tenantId, manager);
    await this.assertUserPermission(context.userId, 'ai_mcp', 'reader', manager);
  }

  async assertSettingsAccess(
    context: AiPolicyAccessContext,
    manager: EntityManager,
  ): Promise<void> {
    this.assertPlatformHostAllowed(context);

    if (!Features.AI_SETTINGS_ENABLED) {
      throwFeatureDisabled('ai_settings');
    }

    await this.assertTenantAvailable(context.tenantId, manager);
    await this.assertUserPermission(context.userId, 'ai_settings', 'admin', manager);
  }

  async assertKnowledgeReadAccess(context: AiExecutionContext, manager: EntityManager): Promise<void> {
    await this.assertSurfaceAccess(context, manager);
    await this.assertUserPermission(context.userId, 'knowledge', 'reader', manager);
  }

  async assertBusinessPermission(
    context: AiExecutionContext,
    businessResource: string,
    minimumLevel: PermissionLevel,
    manager: EntityManager,
  ): Promise<void> {
    await this.assertSurfaceAccess(context, manager);
    await this.assertUserPermission(context.userId, businessResource, minimumLevel, manager);
  }

  async assertEntityTypeReadAccess(
    context: AiExecutionContext,
    entityType: AiSearchEntityType | AiContextEntityType,
    manager: EntityManager,
  ): Promise<void> {
    await this.assertBusinessPermission(context, ENTITY_RESOURCE[entityType], 'reader', manager);
  }

  async listReadableEntityTypes(
    context: AiExecutionContext,
    requested: Array<AiSearchEntityType | AiContextEntityType>,
    manager: EntityManager,
  ): Promise<Array<AiSearchEntityType | AiContextEntityType>> {
    await this.assertSurfaceAccess(context, manager);

    const readable: Array<AiSearchEntityType | AiContextEntityType> = [];
    for (const entityType of requested) {
      try {
        await this.assertUserPermission(context.userId, ENTITY_RESOURCE[entityType], 'reader', manager);
        readable.push(entityType);
      } catch (error) {
        if (!(error instanceof ForbiddenException)) {
          this.logger.warn(
            `Unexpected error while probing ${entityType} read access for user ${context.userId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    return readable;
  }

  async assertWriteAccess(
    context: AiExecutionContext,
    businessResource: string,
    manager: EntityManager,
  ): Promise<void> {
    if (context.surface !== 'chat') {
      throw new ForbiddenException('MCP write access is not available.');
    }

    await this.assertSurfaceAccess(context, manager);
    await this.assertUserPermission(context.userId, 'ai_chat', 'member', manager);
    await this.assertUserPermission(context.userId, businessResource, 'member', manager);
    await this.assertBillingAllowsWrite(context.tenantId, manager);
  }

  private async assertBillingAllowsWrite(tenantId: string, manager: EntityManager): Promise<void> {
    if (!this.stripeConfig.isConfigured()) {
      return;
    }

    const subscription = await manager.getRepository(Subscription).findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    if (!subscription) {
      throw new ForbiddenException({
        error: 'SUBSCRIPTION_FROZEN',
        message: 'No active subscription found.',
      });
    }

    const now = Date.now();
    switch (subscription.status) {
      case SubscriptionStatus.TRIALING:
        if (subscription.trial_end && subscription.trial_end.getTime() > now) {
          return;
        }
        throw new ForbiddenException({
          error: 'TRIAL_EXPIRED',
          message: 'Your trial has expired. Please choose a plan to continue.',
        });

      case SubscriptionStatus.ACTIVE:
        return;

      case SubscriptionStatus.PAST_DUE: {
        const freezeEffectiveAt = this.computeFreezeEffectiveAt(subscription);
        if (freezeEffectiveAt && now < freezeEffectiveAt) {
          return;
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
    const graceMs = FREEZE_GRACE_DAYS * 86400000;

    if (subscription.collection_method === CollectionMethod.SEND_INVOICE) {
      if (subscription.latest_invoice_created && subscription.days_until_due != null) {
        return subscription.latest_invoice_created.getTime()
          + subscription.days_until_due * 86400000
          + graceMs;
      }
      if (subscription.current_period_end) {
        return subscription.current_period_end.getTime() + graceMs;
      }
      return null;
    }

    if (subscription.current_period_end) {
      return subscription.current_period_end.getTime() + graceMs;
    }

    return null;
  }
}
