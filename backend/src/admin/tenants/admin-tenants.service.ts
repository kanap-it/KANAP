import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../tenants/tenant.entity';
import { parsePagination } from '../../common/pagination';
import { TenantStatsService } from './tenant-stats.service';
import { BillingService } from '../../billing/billing.service';
import { withTenant } from '../../common/tenant-runner';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { FreezeTenantDto } from './dto/freeze-tenant.dto';
import { DeleteTenantDto } from './dto/delete-tenant.dto';
import { AuditService } from '../../audit/audit.service';
import { Subscription } from '../../billing/subscription.entity';
import { TrialSignup } from '../../public/trial-signup.entity';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class AdminTenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(TrialSignup)
    private readonly trialSignups: Repository<TrialSignup>,
    private readonly dataSource: DataSource,
    private readonly stats: TenantStatsService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async listTenants(query: any) {
    const { page, limit, skip, sort, status, q } = parsePagination(query);
    const qb = this.tenants
      .createQueryBuilder('tenant')
      .where('tenant.deleted_at IS NULL')
      .andWhere('tenant.is_system_tenant IS NOT TRUE');
    if (status) {
      qb.andWhere('tenant.status = :status', { status });
    }
    if (q) {
      qb.andWhere('(tenant.slug ILIKE :term OR tenant.name ILIKE :term)', { term: `%${q}%` });
    }
    const sortable = new Set(['created_at', 'updated_at', 'slug', 'name', 'status']);
    const orderField = sortable.has(sort.field) ? sort.field : 'created_at';
    const total = await qb.getCount();
    const rows = await qb
      .orderBy(`tenant.${orderField}`, sort.direction as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const items = await Promise.all(rows.map(async (tenant) => this.buildTenantSummary(tenant)));
    return { items, total, page, limit };
  }

  async getTenantDetail(id: string) {
    const tenant = await this.findTenantOrFail(id);
    const summary = await this.buildTenantSummary(tenant, { includeInternal: true });
    return summary;
  }

  async updatePlan(tenantId: string, actorId: string | null, dto: UpdateTenantPlanDto) {
    const tenant = await this.findTenantOrFail(tenantId);
    this.ensureNotSystemTenant(tenant);
    await withTenant(this.dataSource, tenantId, async (manager) => {
      await this.applyPlanUpdate(manager, tenantId, actorId, dto);
    });
    return this.getTenantDetail(tenantId);
  }

  async freezeTenant(tenantId: string, actorId: string | null, body: FreezeTenantDto) {
    const tenant = await this.findTenantOrFail(tenantId);
    this.ensureNotSystemTenant(tenant);
    if (tenant.status === TenantStatus.DELETED) {
      throw new BadRequestException('Tenant already deleted');
    }
    if (tenant.status === TenantStatus.FROZEN) {
      return this.getTenantDetail(tenantId);
    }
    const before = this.serializeTenant(tenant);
    tenant.status = TenantStatus.FROZEN;
    tenant.frozen_at = new Date();
    tenant.frozen_by = actorId ?? null;
    if (body?.reason) {
      tenant.notes = body.reason;
    }
    await this.tenants.save(tenant);
    await this.logTenantAction(tenantId, actorId, 'freeze', before, this.serializeTenant(tenant));
    return this.getTenantDetail(tenantId);
  }

  async unfreezeTenant(tenantId: string, actorId: string | null) {
    const tenant = await this.findTenantOrFail(tenantId);
    this.ensureNotSystemTenant(tenant);
    if (tenant.status !== TenantStatus.FROZEN) {
      return this.getTenantDetail(tenantId);
    }
    const before = this.serializeTenant(tenant);
    tenant.status = TenantStatus.ACTIVE;
    tenant.frozen_at = null;
    tenant.frozen_by = null;
    await this.tenants.save(tenant);
    await this.logTenantAction(tenantId, actorId, 'unfreeze', before, this.serializeTenant(tenant));
    return this.getTenantDetail(tenantId);
  }

  private async buildTenantSummary(tenant: Tenant, opts?: { includeInternal?: boolean }) {
    const stats = await this.stats.compute(tenant.id);
    let plan: any = null;
    if (tenant.status !== TenantStatus.DELETED) {
      plan = await withTenant(this.dataSource, tenant.id, (manager) => this.billing.getSubscriptionSummary({ manager }));
    }

    const base: any = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      frozen_at: tenant.frozen_at,
      frozen_by: tenant.frozen_by,
      deletion_requested_at: tenant.deletion_requested_at,
      deletion_requested_by: tenant.deletion_requested_by,
      deletion_confirmed_at: tenant.deletion_confirmed_at,
      deleted_at: tenant.deleted_at,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      stats,
      plan,
    };

    if (opts?.includeInternal) {
      base.deletion_reason = tenant.deletion_reason;
      base.notes = tenant.notes;
      base.metadata = tenant.metadata ?? {};
    }
    return base;
  }

  private async findTenantOrFail(id: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private ensureNotSystemTenant(tenant: Tenant) {
    if (tenant.is_system_tenant) {
      throw new BadRequestException('System tenants cannot be modified');
    }
  }

  private async applyPlanUpdate(
    manager: EntityManager,
    tenantId: string,
    actorId: string | null,
    dto: UpdateTenantPlanDto,
  ) {
    const subsRepo = manager.getRepository(Subscription);
    let sub = await subsRepo.findOne({ where: {} });
    if (!sub) {
      sub = subsRepo.create({ plan_name: 'Starter', seat_limit: 5 });
      sub = await subsRepo.save(sub);
    }
    const before = this.serializeSubscription(sub);
    if (dto.plan_name !== undefined) {
      sub.plan_name = dto.plan_name ?? null;
    }
    if (dto.seat_limit !== undefined) {
      if (dto.seat_limit < 0) throw new BadRequestException('seat_limit must be >= 0');
      sub.seat_limit = dto.seat_limit;
    }
    if (dto.active_seats !== undefined) {
      if (dto.active_seats < 0) throw new BadRequestException('active_seats must be >= 0');
      sub.active_seats = dto.active_seats;
    }
    if (dto.subscription_type !== undefined) {
      sub.subscription_type = dto.subscription_type;
    }
    if (dto.payment_mode !== undefined) {
      sub.payment_mode = dto.payment_mode;
    }
    if (dto.next_payment_at !== undefined) {
      sub.next_payment_at = dto.next_payment_at ? new Date(dto.next_payment_at) : null;
    }
    if (dto.notes !== undefined) {
      sub.notes = dto.notes ?? null;
    }
    sub.last_synced_at = new Date();
    sub = await subsRepo.save(sub);
    const after = this.serializeSubscription(sub);

    await this.audit.log(
      {
        table: 'tenants_plan',
        recordId: sub.id,
        action: 'update',
        before,
        after,
        userId: actorId ?? null,
      },
      { manager },
    );
  }

  async deleteTenant(tenantId: string, actorId: string | null, dto: DeleteTenantDto) {
    const tenant = await this.findTenantOrFail(tenantId);
    this.ensureNotSystemTenant(tenant);
    if (tenant.status === TenantStatus.DELETED) {
      throw new BadRequestException('Tenant already deleted');
    }
    // Keep the original slug to clean up trial signups later
    const originalSlug = tenant.slug;
    const confirm = dto.confirmSlug?.trim();
    if (!confirm || confirm !== tenant.slug) {
      throw new BadRequestException('Confirmation slug does not match tenant');
    }

    const reason = dto.reason?.trim() || null;
    const beforeRequest = this.serializeTenant(tenant);
    tenant.status = TenantStatus.DELETING;
    tenant.deletion_requested_at = new Date();
    tenant.deletion_requested_by = actorId ?? null;
    tenant.deletion_reason = reason;
    await this.tenants.save(tenant);
    await this.logTenantAction(tenantId, actorId, 'delete-request', beforeRequest, this.serializeTenant(tenant));

    let purgeReport: Array<{ table: string; deleted: number }> = [];
    try {
      purgeReport = await this.purgeTenantData(tenantId);
    } catch (error) {
      const beforeFail = this.serializeTenant(tenant);
      tenant.status = TenantStatus.FROZEN;
      await this.tenants.save(tenant);
      await this.logTenantAction(tenantId, actorId, 'delete-failed', beforeFail, this.serializeTenant(tenant));
      throw error;
    }

    const beforeComplete = this.serializeTenant(tenant);
    const completedAt = new Date();
    tenant.status = TenantStatus.DELETED;
    tenant.deletion_confirmed_at = completedAt;
    tenant.deleted_at = completedAt;
    tenant.frozen_at = null;
    tenant.frozen_by = null;
    tenant.notes = null;
    // Clear slug to free reuse and avoid ambiguity for deleted tenants
    tenant.slug = `deleted-${tenant.slug}-${completedAt.getTime()}`;
    await this.tenants.save(tenant);
    await this.logTenantAction(tenantId, actorId, 'delete-complete', beforeComplete, this.serializeTenant(tenant));

    // Clean up any trial signup for the original slug to allow clean re-signup
    try {
      await this.trialSignups.delete({ slug: originalSlug });
    } catch (e) {
      // Non-fatal; log and continue
      console.warn('[tenants] Failed to delete trial_signup for slug', originalSlug, (e as Error)?.message);
    }

    const detail = await this.getTenantDetail(tenantId);
    return { tenant: detail, purgeReport };
  }

  private async logTenantAction(
    tenantId: string,
    actorId: string | null,
    action: 'freeze' | 'unfreeze' | 'plan-update' | 'delete-request' | 'delete-complete' | 'delete-failed',
    before: any,
    after: any,
  ) {
    await withTenant(this.dataSource, tenantId, async (manager) => {
      await this.audit.log(
        {
          table: 'tenants_admin',
          recordId: tenantId,
          action: 'update',
          before,
          after,
          userId: actorId ?? null,
        },
        { manager },
      );
    });
  }

  private async purgeTenantData(tenantId: string) {
    const tablesInOrder = [
      // Portfolio: purge in FK order (children before parents)
      'portfolio_project_time_entries',
      'portfolio_project_milestones',
      'portfolio_project_phases',
      'portfolio_project_opex',
      'portfolio_project_capex',
      'portfolio_project_attachments',
      'portfolio_project_urls',
      'portfolio_project_dependencies',
      'portfolio_project_contacts',
      'portfolio_project_effort_allocations',
      'portfolio_project_team',
      'portfolio_request_projects',
      'portfolio_request_opex',
      'portfolio_request_capex',
      'portfolio_request_business_processes',
      'portfolio_request_attachments',
      'portfolio_request_urls',
      'portfolio_request_dependencies',
      'portfolio_request_contacts',
      'portfolio_request_team',
      'portfolio_activities',
      'portfolio_projects',
      'portfolio_requests',
      // portfolio_criterion_values: no tenant_id (dropped in migration 1767200000000)
      // Records deleted via ON DELETE CASCADE from portfolio_criteria
      'portfolio_criteria',
      'portfolio_team_member_configs',
      'portfolio_teams',
      'portfolio_phase_template_items',
      'portfolio_phase_templates',
      'portfolio_streams',
      'portfolio_categories',
      'portfolio_sources',
      'portfolio_skills',
      'portfolio_settings',
      // Applications: purge attachments and links first
      'application_attachments',
      'application_links',
      'application_contracts',
      'application_capex_items',
      'application_spend_items',
      'application_departments',
      'application_companies',
      'application_owners',
      'application_data_residency',
      'application_support_contacts',
      // Interfaces: purge interface-level tables before base interfaces
      'interface_attachments',
      'interface_links',
      'interface_data_residency',
      'interface_key_identifiers',
      'interface_dependencies',
      'interface_companies',
      'interface_owners',
      'interface_middleware_applications',
      'interface_legs',
      'interface_connection_links',
      'interface_bindings',
      'connection_legs',
      'connection_protocols',
      'connection_servers',
      'connections',
      'app_asset_assignments',
      'interfaces',
      'app_instances',
      // Asset extension tables must be purged before assets
      'asset_hardware_info',
      'asset_support_info',
      'asset_relations',
      'asset_spend_items',
      'asset_capex_items',
      'asset_contracts',
      'asset_cluster_members',
      'assets',
      'location_links',
      'location_contacts',
      'location_user_contacts',
      'locations',
      'applications',
      'contract_attachments',
      'contract_tasks',
      'contract_links',
      'contract_spend_items',
      'contract_capex_items',
      'contracts',
      // unified tasks table (attachments and time entries before tasks due to FK)
      'task_attachments',
      'task_time_entries',
      'user_time_monthly_aggregates',
      'tasks',
      'spend_amounts',
      'spend_allocations',
      'spend_versions',
      'spend_tasks',
      'spend_links',
      'spend_attachments',
      'spend_items',
      'business_process_category_links',
      'business_processes',
      'business_process_categories',
      'analytics_categories',
      'capex_amounts',
      'capex_allocations',
      'capex_versions',
      'capex_links',
      'capex_attachments',
      // currency rate snapshots per-tenant
      'currency_rate_sets',
      'capex_items',
      'freeze_states',
      'department_metrics',
      'company_metrics',
      'departments',
      'companies',
      'user_page_roles',
      'user_roles',
      'role_permissions',
      'user_dashboard_config',
      'user_notification_preferences',
      'users',
      'roles',
      // Contacts must be purged before suppliers (supplier_contacts has FKs to both)
      'supplier_contacts',
      'contacts',
      'suppliers',
      'accounts',
      // Chart of Accounts introduced recently; ensure CoAs are purged per-tenant
      'chart_of_accounts',
      'allocation_rules',
      'audit_log',
      'subscriptions',
    ];

    return withTenant(this.dataSource, tenantId, async (manager) => {
      const report: Array<{ table: string; deleted: number }> = [];
      const tenantTables = new Set<string>(
        (await manager.query(
          `SELECT table_name
           FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'tenant_id'`,
        )).map((row: { table_name: string }) => row.table_name),
      );
      const missingTenantId = tablesInOrder.filter((table) => !tenantTables.has(table));
      if (missingTenantId.length > 0) {
        throw new BadRequestException(
          `Tenant purge misconfigured: missing tenant_id on tables: ${missingTenantId.join(', ')}`,
        );
      }

      const deleteTable = async (table: string) => {
        const res = await manager.query(
          `WITH deleted AS (
            DELETE FROM ${table}
            WHERE tenant_id = app_current_tenant()
            RETURNING 1
          )
          SELECT COUNT(*)::int AS count FROM deleted`,
        );
        const count = Number(res?.[0]?.count ?? 0);
        report.push({ table, deleted: count });
      };

      // For attachment tables, delete remote S3 objects first
      const attachmentTables = new Set([
        'portfolio_project_attachments',
        'portfolio_request_attachments',
        'contract_attachments',
        'capex_attachments',
        'spend_attachments',
        'application_attachments',
        'interface_attachments',
      ]);

      for (const table of tablesInOrder) {
        if (attachmentTables.has(table)) {
          try {
            const rows: Array<{ storage_path: string }> = await manager.query(
              `SELECT storage_path FROM ${table} WHERE tenant_id = app_current_tenant()`
            );
            for (const row of rows) {
              if (row?.storage_path) {
                try { await this.storage.deleteObject(row.storage_path); } catch {}
              }
            }
          } catch (e) {
            // Non-fatal; proceed with DB purge
            console.warn(`[purge] Failed to list objects for ${table}:`, (e as Error)?.message);
          }
        }
        await deleteTable(table);
      }

      return report;
    });
  }

  private serializeTenant(tenant: Tenant) {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      frozen_at: tenant.frozen_at?.toISOString() ?? null,
      frozen_by: tenant.frozen_by ?? null,
      deletion_requested_at: tenant.deletion_requested_at?.toISOString() ?? null,
      deletion_requested_by: tenant.deletion_requested_by ?? null,
      deletion_confirmed_at: tenant.deletion_confirmed_at?.toISOString() ?? null,
      deleted_at: tenant.deleted_at?.toISOString() ?? null,
      deletion_reason: tenant.deletion_reason ?? null,
      notes: tenant.notes ?? null,
      stripe_customer_id: tenant.stripe_customer_id ?? null,
      billing_email: tenant.billing_email ?? null,
      billing_company_name: tenant.billing_company_name ?? null,
      billing_phone: tenant.billing_phone ?? null,
      billing_tax_id: tenant.billing_tax_id ?? null,
      billing_address: tenant.billing_address ?? null,
      billing_customer_info: tenant.billing_customer_info ?? null,
      billing_invoice_info: tenant.billing_invoice_info ?? null,
      metadata: tenant.metadata ?? {},
    };
  }

  private serializeSubscription(sub: Subscription) {
    return {
      id: sub.id,
      plan_name: sub.plan_name ?? null,
      seat_limit: sub.seat_limit,
      active_seats: sub.active_seats,
      subscription_type: sub.subscription_type,
      payment_mode: sub.payment_mode,
      next_payment_at: sub.next_payment_at ? sub.next_payment_at.toISOString() : null,
      last_synced_at: sub.last_synced_at ? sub.last_synced_at.toISOString() : null,
      status: sub.status ?? null,
      collection_method: sub.collection_method ?? null,
      current_period_start: sub.current_period_start ? sub.current_period_start.toISOString() : null,
      current_period_end: sub.current_period_end ? sub.current_period_end.toISOString() : null,
      trial_end: sub.trial_end ? sub.trial_end.toISOString() : null,
      cancel_at: sub.cancel_at ? sub.cancel_at.toISOString() : null,
      canceled_at: sub.canceled_at ? sub.canceled_at.toISOString() : null,
      currency: sub.currency ?? null,
      amount: sub.amount ?? null,
      amount_currency: sub.currency ?? null,
      estimated_amount: sub.amount ?? null,
      estimated_currency: sub.currency ?? null,
      stripe_product_id: sub.stripe_product_id ?? null,
      stripe_price_id: sub.stripe_price_id ?? null,
      default_payment_method_id: sub.default_payment_method_id ?? null,
      default_payment_method_brand: sub.default_payment_method_brand ?? null,
      default_payment_method_last4: sub.default_payment_method_last4 ?? null,
      latest_invoice_id: sub.latest_invoice_id ?? null,
      latest_invoice_status: sub.latest_invoice_status ?? null,
      latest_invoice_number: sub.latest_invoice_number ?? null,
      latest_invoice_url: sub.latest_invoice_url ?? null,
      latest_invoice_pdf: sub.latest_invoice_pdf ?? null,
      latest_invoice_amount: sub.latest_invoice_amount ?? null,
      latest_invoice_currency: sub.latest_invoice_currency ?? null,
      latest_invoice_created: sub.latest_invoice_created ? sub.latest_invoice_created.toISOString() : null,
      days_until_due: sub.days_until_due ?? null,
      last_payment_error_code: sub.last_payment_error_code ?? null,
      last_payment_error_message: sub.last_payment_error_message ?? null,
      stripe_subscription_id: sub.stripe_subscription_id ?? null,
      stripe_customer_id: sub.stripe_customer_id ?? null,
      canceled_at_effective: sub.canceled_at_effective ? sub.canceled_at_effective.toISOString() : null,
      notes: sub.notes ?? null,
    };
  }
}
