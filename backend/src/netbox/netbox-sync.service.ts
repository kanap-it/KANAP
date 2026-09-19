import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AiAdapterConfig } from '../ai/control-plane/providers/adapter-config.entity';
import { AssetsService } from '../assets/services';
import { assertPublicHttpUrl } from '../common/ssrf-guard';
import { withTenantExecution } from '../common/tenant-runner';
import { ItOpsSettingsService } from '../it-ops-settings/it-ops-settings.service';
import { AssetExternalLinkState } from './asset-external-link.entity';
import { NetboxClient } from './netbox.client';
import {
  NETBOX_LINK_SOURCE,
  NetboxConfigService,
  NetboxSyncStateView,
  normalizeNetboxAddress,
} from './netbox-config.service';
import {
  MappedAssetFields,
  MappedHardwareFields,
  NETBOX_VIRTUAL_MACHINES_NAME,
  NETBOX_VIRTUAL_MACHINES_SLUG,
  NetboxCatalogs,
  NetboxMapping,
  mapNetboxObject,
  matchCatalogOption,
} from './netbox-mapper';
import { ExistingAsset } from './netbox-matcher';
import { NetboxNotice, netboxNotice, netboxNoticeFromStore } from './netbox-notice';
import {
  ExistingLink,
  NetboxPlan,
  NetboxPlanRow,
  NetboxSyncCounts,
  diffNetboxMapping,
  externalKey,
  planNetboxSync,
} from './netbox-planner';
import { NetboxApiError, NetboxObject, NetboxObjectType } from './netbox.types';

// One engine for the three ways a synchronisation can be asked for: the
// read-only preview, the manual run and the scheduled run. Fetch, map, match,
// plan, then apply — the first four steps are identical everywhere, only the
// last one is skipped for a preview.
//
// Writes go through the asset services (never raw SQL), so validation,
// references and audit entries behave exactly as they do for a person, with
// the audit source set to the Netbox sync instead of a user.

const RUNNING_LOCK_PREFIX = 'netbox-sync';
/** The preview sends at most this many rows to the browser. */
const PREVIEW_ROW_LIMIT = 500;
/**
 * A run gives up after this many objects fail one after another. Writing
 * thousands of error rows and then reporting success helps nobody: something
 * systematic is wrong (a catalog value every object needs, a permission), and
 * it should be said once, loudly.
 */
const CONSECUTIVE_FAILURE_LIMIT = 10;

export type NetboxRecordRow = {
  id: string;
  external_type: NetboxObjectType;
  external_id: string;
  external_name: string | null;
  external_url: string;
  state: AssetExternalLinkState;
  asset: { id: string; name: string; asset_reference: string | null; status: string } | null;
  candidates: Array<{ id: string; name: string; asset_reference: string | null }>;
  message: NetboxNotice | null;
  last_seen_at: string | null;
  last_synced_at: string | null;
};

export type NetboxPreviewResult = {
  ok: boolean;
  message: string | null;
  counts: NetboxSyncCounts;
  rows: NetboxPlanRow[];
  rows_truncated: boolean;
  missing: NetboxRecordRow[];
};

export type NetboxStatus = {
  configured: boolean;
  enabled: boolean;
  auto_sync: boolean;
  sync: NetboxSyncStateView;
  records: Record<AssetExternalLinkState, number>;
};

export type NetboxResolveInput = {
  action?: unknown;
  asset_id?: unknown;
};

type LocalContext = {
  config: AiAdapterConfig;
  catalogs: NetboxCatalogs;
  assets: ExistingAsset[];
  links: ExistingLink[];
  defaultEnvironment: string;
  roleMap: Record<string, string>;
  siteMap: Record<string, string>;
};

type ApplyOutcome =
  | { action: 'create' | 'update' | 'unchanged'; assetId: string }
  | { action: 'error'; notice: NetboxNotice };

const ASSET_FIELD_BY_DIFF_KEY: Record<string, keyof MappedAssetFields> = {
  name: 'name',
  kind: 'kind',
  location: 'location_id',
  status: 'status',
  hostname: 'hostname',
  domain: 'domain',
  operating_system: 'operating_system',
  primary_ip: 'ip_addresses',
};

const HARDWARE_FIELDS: Array<keyof MappedHardwareFields> = [
  'serial_number',
  'manufacturer',
  'model',
  'rack_location',
  'rack_unit',
];

// Every read of a record row selects exactly these columns.
const RECORD_COLUMNS = `l.id, l.external_type, l.external_id, l.external_name, l.external_url, l.state,
              l.candidate_asset_ids, l.message_code, l.message_params, l.last_seen_at, l.last_synced_at,
              a.id AS asset_id, a.name AS asset_name, a.asset_reference, a.status AS asset_status`;

function emptyRecordCounts(): Record<AssetExternalLinkState, number> {
  return { linked: 0, ambiguous: 0, missing: 0, ignored: 0, error: 0 };
}

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The message an HTTP exception carries, when it carries one. */
function httpExceptionMessage(error: HttpException): string | null {
  const response = error.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown })?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return null;
}

/** A message safe to show an administrator, whatever went wrong. */
export function plainErrorMessage(error: unknown): string {
  if (error instanceof NetboxApiError) {
    return error.message;
  }
  if (error instanceof HttpException) {
    const message = httpExceptionMessage(error);
    if (message) return message;
  }
  return 'The synchronisation could not finish. Check the Netbox connection, then try again.';
}

/**
 * The notice one object's failure deserves. A rejection from the asset
 * services already reads plainly ("Invalid hostname format"), so it is passed
 * through; anything else points at the server log rather than at the Netbox
 * connection, which is demonstrably working if we got this far.
 */
export function objectFailureNotice(error: unknown): NetboxNotice {
  if (error instanceof BadRequestException) {
    const detail = httpExceptionMessage(error);
    if (detail) return netboxNotice('validation_failed', { detail });
  }
  return netboxNotice('save_failed');
}

function isDuplicateIpRejection(error: unknown): boolean {
  return error instanceof BadRequestException
    && /ip address/i.test(httpExceptionMessage(error) ?? '');
}

@Injectable()
export class NetboxSyncService {
  private readonly logger = new Logger(NetboxSyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: NetboxConfigService,
    private readonly client: NetboxClient,
    private readonly itOpsSettings: ItOpsSettingsService,
    private readonly assets: AssetsService,
  ) {}

  // ==========================================================================
  // Read side
  // ==========================================================================

  async getStatus(manager: EntityManager, tenantId: string): Promise<NetboxStatus> {
    const config = await this.config.getConfig(manager, tenantId);
    const view = this.config.toView(config);
    const rows: Array<{ state: AssetExternalLinkState; total: string }> = await manager.query(
      `SELECT state, count(*)::text AS total
       FROM asset_external_links
       WHERE tenant_id = $1 AND source = $2
       GROUP BY state`,
      [tenantId, NETBOX_LINK_SOURCE],
    );
    const records = emptyRecordCounts();
    for (const row of rows) {
      records[row.state] = Number(row.total) || 0;
    }
    return {
      configured: view.configured,
      enabled: view.enabled,
      auto_sync: view.auto_sync,
      sync: this.config.readSyncState(config),
      records,
    };
  }

  async listRecords(
    manager: EntityManager,
    tenantId: string,
    query: { state?: string; page?: string | number; limit?: string | number },
  ): Promise<{ items: NetboxRecordRow[]; total: number }> {
    // Whole numbers only, and bound as parameters: neither value reaches the
    // SQL text, so a crafted query string cannot shape the statement.
    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const limit = Math.min(200, Math.max(1, Math.floor(Number(query.limit)) || 50));
    const state = typeof query.state === 'string' && query.state.trim() ? query.state.trim() : null;

    const where = `WHERE l.tenant_id = $1 AND l.source = $2${state ? ' AND l.state = $3' : ''}`;
    const params: unknown[] = state ? [tenantId, NETBOX_LINK_SOURCE, state] : [tenantId, NETBOX_LINK_SOURCE];

    const totalRows: Array<{ total: string }> = await manager.query(
      `SELECT count(*)::text AS total FROM asset_external_links l ${where}`,
      params,
    );
    const rows = await manager.query(
      `SELECT ${RECORD_COLUMNS}
       FROM asset_external_links l
       LEFT JOIN assets a ON a.id = l.asset_id AND a.tenant_id = $1
       ${where}
       ORDER BY l.external_name ASC NULLS LAST, l.external_id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    return {
      items: await this.decorateRecords(manager, tenantId, rows),
      total: Number(totalRows[0]?.total) || 0,
    };
  }

  // Resolves the candidate assets of every row in one batched query.
  private async decorateRecords(
    manager: EntityManager,
    tenantId: string,
    rows: Array<Record<string, any>>,
  ): Promise<NetboxRecordRow[]> {
    const candidateIds = Array.from(new Set(
      rows.flatMap((row) => (Array.isArray(row.candidate_asset_ids) ? row.candidate_asset_ids : [])),
    ));
    const candidates: Array<{ id: string; name: string; asset_reference: string | null }> = candidateIds.length > 0
      ? await manager.query(
        `SELECT id, name, asset_reference FROM assets WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, candidateIds],
      )
      : [];
    const candidateById = new Map(candidates.map((asset) => [asset.id, asset]));

    return rows.map((row) => ({
      id: row.id,
      external_type: row.external_type,
      external_id: row.external_id,
      external_name: row.external_name,
      external_url: row.external_url,
      state: row.state,
      asset: row.asset_id
        ? { id: row.asset_id, name: row.asset_name, asset_reference: row.asset_reference, status: row.asset_status }
        : null,
      candidates: (Array.isArray(row.candidate_asset_ids) ? row.candidate_asset_ids : [])
        .map((id: string) => candidateById.get(id))
        .filter((asset: unknown): asset is { id: string; name: string; asset_reference: string | null } => !!asset),
      message: netboxNoticeFromStore(row.message_code, row.message_params),
      last_seen_at: isoOrNull(row.last_seen_at),
      last_synced_at: isoOrNull(row.last_synced_at),
    }));
  }

  private async findRecord(manager: EntityManager, tenantId: string, id: string): Promise<NetboxRecordRow> {
    const rows = await manager.query(
      `SELECT ${RECORD_COLUMNS}
       FROM asset_external_links l
       LEFT JOIN assets a ON a.id = l.asset_id AND a.tenant_id = $1
       WHERE l.tenant_id = $1 AND l.source = $2 AND l.id = $3`,
      [tenantId, NETBOX_LINK_SOURCE, id],
    );
    if (rows.length === 0) {
      throw new NotFoundException('This Netbox object is not in the list any more.');
    }
    return (await this.decorateRecords(manager, tenantId, rows))[0];
  }

  /**
   * Admin "Test connection". Values typed in the dialog win over the stored
   * ones so an address can be checked before it is saved. Never throws for a
   * connection problem: the card shows the reason.
   */
  async testConnection(
    manager: EntityManager,
    tenantId: string,
    input: { base_url?: unknown; api_token?: unknown; insecure_tls?: unknown; request_timeout_seconds?: unknown },
  ): Promise<{ ok: boolean; message: string; netbox_version?: string }> {
    const config = await this.config.getConfig(manager, tenantId);
    const baseUrlRaw = typeof input.base_url === 'string' && input.base_url.trim() ? input.base_url.trim() : null;
    const tokenRaw = typeof input.api_token === 'string' && input.api_token.trim() ? input.api_token.trim() : null;
    const timeoutRaw = Number(input.request_timeout_seconds);

    let connection;
    try {
      const baseUrl = baseUrlRaw ? normalizeNetboxAddress(baseUrlRaw) : null;
      if (baseUrl) assertPublicHttpUrl(baseUrl); // SSRF: blocks internal targets in cloud, no-op on-prem
      connection = this.config.buildConnection(config, {
        baseUrl,
        token: tokenRaw,
        insecureTls: typeof input.insecure_tls === 'boolean' ? input.insecure_tls : undefined,
        timeoutSeconds: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : undefined,
      });
    } catch (error) {
      return { ok: false, message: plainErrorMessage(error) };
    }

    try {
      const version = await this.client.getVersion(connection);
      return {
        ok: true,
        ...(version ? { netbox_version: version } : {}),
        message: version ? `Connected to Netbox ${version}.` : 'Connected to Netbox.',
      };
    } catch (error) {
      return { ok: false, message: plainErrorMessage(error) };
    }
  }

  /**
   * Roles and sites as Netbox reports them, next to the KANAP asset types and
   * locations they can be matched with, plus a suggestion for every role or
   * site whose name already matches one.
   */
  async mappingOptions(manager: EntityManager, tenantId: string) {
    const config = await this.config.getConfig(manager, tenantId);
    const view = this.config.toView(config);
    if (!view.configured) {
      throw new BadRequestException('Set up the Netbox connection first, then choose the matches.');
    }
    const connection = this.config.buildConnection(config);
    let deviceRoles;
    let sites;
    let virtualMachineCount;
    try {
      [deviceRoles, sites, virtualMachineCount] = await Promise.all([
        this.client.listRoles(connection),
        this.client.listSites(connection),
        this.client.countVirtualMachines(connection),
      ]);
    } catch (error) {
      throw new BadRequestException(plainErrorMessage(error));
    }

    // Every virtual machine is matched through one reserved entry, listed
    // first: their Netbox roles are not used, so a single decision covers them.
    const roles = [
      {
        slug: NETBOX_VIRTUAL_MACHINES_SLUG,
        name: NETBOX_VIRTUAL_MACHINES_NAME,
        device_count: 0,
        vm_count: virtualMachineCount,
      },
      ...deviceRoles.filter((role) => role.slug !== NETBOX_VIRTUAL_MACHINES_SLUG),
    ];

    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const locations: Array<{ id: string; name: string }> = await manager.query(
      `SELECT id, name FROM locations WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId],
    );
    const assetKinds = settings.serverKinds.map((option) => ({ code: option.code, label: option.label }));
    const saved = this.config.getMapping(config);

    const suggestedRoleMap: Record<string, string> = {};
    for (const role of roles) {
      if (saved.role_map[role.slug]) continue;
      // "Virtual machines" has no Netbox name to match on, so it is suggested
      // the virtual-machine asset type directly when the tenant has one.
      const match = role.slug === NETBOX_VIRTUAL_MACHINES_SLUG
        ? settings.serverKinds.find((option) => option.code === 'virtual_machine') ?? null
        : matchCatalogOption(role.name, settings.serverKinds).option;
      if (match) suggestedRoleMap[role.slug] = match.code;
    }
    const suggestedSiteMap: Record<string, string> = {};
    for (const site of sites) {
      if (saved.site_map[site.slug]) continue;
      const match = locations.find((location) => location.name.trim().toLowerCase() === site.name.trim().toLowerCase());
      if (match) suggestedSiteMap[site.slug] = match.id;
    }

    return {
      roles,
      sites,
      asset_kinds: assetKinds,
      locations,
      role_map: saved.role_map,
      site_map: saved.site_map,
      suggested_role_map: suggestedRoleMap,
      suggested_site_map: suggestedSiteMap,
    };
  }

  // ==========================================================================
  // Plan
  // ==========================================================================

  /** Everything the plan needs from the database, read in a handful of queries. */
  private async loadLocalContext(manager: EntityManager, tenantId: string): Promise<LocalContext> {
    const config = await this.config.getConfig(manager, tenantId);
    const view = this.config.toView(config);
    if (!config || !view.configured) {
      throw new BadRequestException('Set up the Netbox connection first, then run a synchronisation.');
    }
    if (!view.enabled) {
      throw new BadRequestException('The Netbox connection is turned off. Turn it on, then run a synchronisation.');
    }

    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const locations: Array<{ id: string; name: string; provider: string | null }> = await manager.query(
      `SELECT id, name, provider FROM locations WHERE tenant_id = $1`,
      [tenantId],
    );
    const assets: ExistingAsset[] = await manager.query(
      `SELECT a.id, a.name, a.asset_reference, a.status, a.kind, a.location_id, a.hostname, a.domain,
              a.fqdn, a.operating_system, a.ip_addresses,
              h.serial_number, h.manufacturer, h.model, h.rack_location, h.rack_unit
       FROM assets a
       LEFT JOIN asset_hardware_info h ON h.asset_id = a.id AND h.tenant_id = $1
       WHERE a.tenant_id = $1`,
      [tenantId],
    );
    const links: ExistingLink[] = await manager.query(
      `SELECT id, external_type, external_id, asset_id, state
       FROM asset_external_links
       WHERE tenant_id = $1 AND source = $2`,
      [tenantId, NETBOX_LINK_SOURCE],
    );
    const mapping = this.config.getMapping(config);

    return {
      config,
      catalogs: {
        assetKinds: settings.serverKinds,
        assetProviders: settings.serverProviders,
        operatingSystems: settings.operatingSystems,
        lifecycleStates: settings.lifecycleStates,
        ipAddressTypes: settings.ipAddressTypes,
        domains: settings.domains,
        subnets: settings.subnets,
        locations,
      },
      assets,
      links,
      defaultEnvironment: view.default_environment,
      roleMap: mapping.role_map,
      siteMap: mapping.site_map,
    };
  }

  /**
   * Fetches every device and virtual machine in one go. `complete` is false
   * when either walk stopped on the page cap: the caller must then treat the
   * inventory as partial and leave the missing computation alone.
   */
  private async fetchObjects(local: LocalContext): Promise<{ objects: NetboxObject[]; complete: boolean }> {
    const connection = this.config.buildConnection(local.config);
    const [devices, virtualMachines] = await Promise.all([
      this.client.listDevices(connection),
      this.client.listVirtualMachines(connection),
    ]);
    return {
      objects: [...devices.objects, ...virtualMachines.objects],
      complete: devices.complete && virtualMachines.complete,
    };
  }

  private buildPlan(
    local: LocalContext,
    fetched: { objects: NetboxObject[]; complete: boolean },
  ): { plan: NetboxPlan; mappings: NetboxMapping[] } {
    const mappings = fetched.objects.map((object) => mapNetboxObject(object, {
      roleMap: local.roleMap,
      siteMap: local.siteMap,
      defaultEnvironment: local.defaultEnvironment,
      catalogs: local.catalogs,
    }));
    const plan = planNetboxSync({
      mappings,
      links: local.links,
      assets: local.assets,
      catalogs: local.catalogs,
      // A partial list is no basis for declaring anything gone.
      fetchOk: fetched.complete,
      totalObjects: fetched.objects.length,
    });
    return { plan, mappings };
  }

  /**
   * Read-only preview, run inside the request. Never writes, never throws for
   * a connection problem: the dialog shows the reason instead.
   */
  async preview(manager: EntityManager, tenantId: string): Promise<NetboxPreviewResult> {
    const local = await this.loadLocalContext(manager, tenantId);
    let fetched: { objects: NetboxObject[]; complete: boolean };
    try {
      fetched = await this.fetchObjects(local);
    } catch (error) {
      return {
        ok: false,
        message: plainErrorMessage(error),
        counts: { create: 0, update: 0, unchanged: 0, ambiguous: 0, skipped: 0, missing: 0, error: 0 },
        rows: [],
        rows_truncated: false,
        missing: [],
      };
    }
    const { plan } = this.buildPlan(local, fetched);
    // Rows that need nothing are left out, except when they carry a warning:
    // an operating system missing from the catalog has to stay visible after
    // the object itself has stopped changing.
    const shown = plan.rows.filter((row) => row.action !== 'unchanged' || row.warnings.length > 0);
    const missingIds = plan.missing.map((link) => link.id);
    const missingRows = missingIds.length > 0
      ? await this.decorateRecords(
        manager,
        tenantId,
        await manager.query(
          `SELECT ${RECORD_COLUMNS}
           FROM asset_external_links l
           LEFT JOIN assets a ON a.id = l.asset_id AND a.tenant_id = $1
           WHERE l.tenant_id = $1 AND l.id = ANY($2::uuid[])
           ORDER BY l.external_name ASC NULLS LAST`,
          [tenantId, missingIds],
        ),
      )
      : [];

    return {
      ok: true,
      // A partial inventory is worth saying out loud before anyone applies it.
      message: fetched.complete ? null : netboxNotice('fetch_incomplete').text,
      counts: plan.counts,
      rows: shown.slice(0, PREVIEW_ROW_LIMIT),
      rows_truncated: shown.length > PREVIEW_ROW_LIMIT,
      missing: missingRows,
    };
  }

  // ==========================================================================
  // Apply
  // ==========================================================================

  /** Starts a manual run in the background; the page polls GET /netbox/status. */
  async startManualRun(manager: EntityManager, tenantId: string): Promise<NetboxStatus> {
    const status = await this.getStatus(manager, tenantId);
    if (!status.configured) {
      throw new BadRequestException('Set up the Netbox connection first, then run a synchronisation.');
    }
    if (!status.enabled) {
      throw new BadRequestException('The Netbox connection is turned off. Turn it on, then run a synchronisation.');
    }
    if (status.sync.status === 'running') {
      // Object response, so `code` sits at the top level of the JSON body the
      // page reads, next to the usual statusCode and message.
      throw new ConflictException({
        statusCode: 409,
        code: 'NETBOX_SYNC_RUNNING',
        message: 'A synchronisation is already running. Wait for it to finish.',
      });
    }
    // Fire and forget: the run writes its own state, so nothing here has to be
    // The lock, not a stored flag, decides whether a run may start: a crashed
    // run leaves a stale 'running' behind but frees its lock, and must not
    // block the button. Taken here, synchronously, and handed to the
    // background run that keeps holding it.
    const runner = await this.acquireRunLock(tenantId);
    if (!runner) {
      throw new ConflictException({
        statusCode: 409,
        code: 'NETBOX_SYNC_RUNNING',
        message: 'A synchronisation is already running. Wait for it to finish.',
      });
    }
    const startedAt = new Date();
    await this.persistState(tenantId, this.runningState('manual', startedAt));
    void this.runLocked(tenantId, 'manual', runner, startedAt).catch((error) => {
      this.logger.error(`Netbox synchronisation could not start for tenant ${tenantId}: ${plainErrorMessage(error)}`);
    });
    return { ...status, sync: this.runningState('manual', startedAt) };
  }

  private runningState(trigger: 'manual' | 'scheduled', startedAt: Date): NetboxSyncStateView {
    return {
      status: 'running',
      trigger,
      started_at: startedAt.toISOString(),
      finished_at: null,
      duration_ms: null,
      counts: null,
      error: null,
      warnings: [],
    };
  }

  /**
   * Takes the per-tenant run lock. Session-scoped, on a connection of its own,
   * because a run uses one transaction per object rather than one for the whole
   * run. Returns null when another run already holds it.
   */
  private async acquireRunLock(tenantId: string) {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      const lock = await runner.query(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
        [`${RUNNING_LOCK_PREFIX}:${tenantId}`],
      );
      if (lock[0]?.locked === true) {
        return runner;
      }
    } catch (error) {
      await this.releaseRunLock(runner, tenantId);
      throw error;
    }
    await runner.release().catch(() => undefined);
    return null;
  }

  /**
   * Gives the lock back. If the unlock fails, the session may still hold it,
   * and returning that session to the pool would block every later run on this
   * tenant: the connection is destroyed instead, which ends the session and
   * the lock with it.
   */
  private async releaseRunLock(
    runner: ReturnType<DataSource['createQueryRunner']>,
    tenantId: string,
  ): Promise<void> {
    try {
      await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [`${RUNNING_LOCK_PREFIX}:${tenantId}`]);
      await runner.release();
      return;
    } catch (error) {
      this.logger.error(
        `Netbox run lock for tenant ${tenantId} could not be released; dropping the connection. ${plainErrorMessage(error)}`,
      );
    }
    try {
      const raw = (runner as unknown as { databaseConnection?: { release?: (err?: unknown) => void; end?: () => void } })
        .databaseConnection;
      // node-postgres removes a pooled client from the pool when it is handed
      // back with an error instead of being returned clean.
      if (typeof raw?.release === 'function') raw.release(new Error('netbox: advisory lock not released'));
      else if (typeof raw?.end === 'function') raw.end();
    } catch {
      // Nothing left to try; the pool will reap the connection on its own.
    }
  }

  /**
   * One run, start to finish, outside any request, holding the lock the caller
   * already took.
   */
  async runInBackground(
    tenantId: string,
    trigger: 'manual' | 'scheduled',
  ): Promise<{ status: 'skipped' | 'success' | 'failure'; counts?: NetboxSyncCounts; error?: string }> {
    const runner = await this.acquireRunLock(tenantId);
    if (!runner) {
      return { status: 'skipped' };
    }
    const startedAt = new Date();
    await this.persistState(tenantId, this.runningState(trigger, startedAt));
    return this.runLocked(tenantId, trigger, runner, startedAt);
  }

  private async runLocked(
    tenantId: string,
    trigger: 'manual' | 'scheduled',
    runner: ReturnType<DataSource['createQueryRunner']>,
    startedAt: Date,
  ): Promise<{ status: 'skipped' | 'success' | 'failure'; counts?: NetboxSyncCounts; error?: string }> {
    try {
      const result = await this.executeRun(tenantId);
      const finishedAt = new Date();
      await this.persistState(tenantId, {
        status: 'success',
        trigger,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        counts: result.counts,
        error: null,
        warnings: result.warnings,
      });
      return { status: 'success', counts: result.counts };
    } catch (error) {
      const finishedAt = new Date();
      const message = plainErrorMessage(error);
      await this.persistState(tenantId, {
        status: 'failure',
        trigger,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        counts: null,
        error: message,
        warnings: [],
      });
      this.logger.warn(`Netbox synchronisation failed for tenant ${tenantId}: ${message}`, (error as Error)?.stack);
      return { status: 'failure', error: message };
    } finally {
      await this.releaseRunLock(runner, tenantId);
    }
  }

  private async persistState(tenantId: string, state: NetboxSyncStateView): Promise<void> {
    await withTenantExecution(this.dataSource, tenantId, (manager) =>
      this.config.writeSyncState(manager, tenantId, state));
  }

  private async executeRun(tenantId: string): Promise<{ counts: NetboxSyncCounts; warnings: NetboxNotice[] }> {
    // Read phase outside any transaction, then the HTTP calls with no database
    // connection held, then one short transaction per object.
    const local = await withTenantExecution(
      this.dataSource,
      tenantId,
      (manager) => this.loadLocalContext(manager, tenantId),
      { transaction: false },
    );
    const fetched = await this.fetchObjects(local);
    const { plan } = this.buildPlan(local, fetched);
    const counts: NetboxSyncCounts = { ...plan.counts, create: 0, update: 0, unchanged: 0, error: 0 };
    const warnings: NetboxNotice[] = fetched.complete ? [] : [netboxNotice('fetch_incomplete')];
    if (!fetched.complete) {
      this.logger.warn(`Netbox returned more pages than KANAP reads for tenant ${tenantId}; the inventory is partial.`);
    }

    // Records whose object Netbox no longer lists are flagged first, so that a
    // device deleted and recreated under a new id finds its asset free and the
    // stale record is cleared away when the new one takes over, below.
    for (const link of plan.missing) {
      await this.markMissing(tenantId, link).catch((error) => this.logRecordFailure(link, error));
    }

    let consecutiveFailures = 0;
    for (const row of plan.rows) {
      const key = externalKey(row.external_type, row.external_id);
      if (row.skip_reason) {
        // Out of scope. An object a person chose to ignore still gets its
        // "last seen" stamp so it does not drift into the missing list.
        if (row.skip_reason === 'ignored') {
          await this.touchIgnored(tenantId, row).catch((error) => this.logRecordFailure(row, error));
        }
        continue;
      }
      if (row.action === 'ambiguous') {
        await this.upsertLink(tenantId, row, {
          assetId: null,
          state: 'ambiguous',
          candidateAssetIds: row.candidates.map((candidate) => candidate.id),
          // The planner already worked out which ambiguity this is.
          notice: row.warnings.at(-1) ?? netboxNotice('ambiguous_candidates'),
          synced: false,
        }).catch((error) => this.logRecordFailure(row, error));
        continue;
      }
      const write = plan.writes.get(key);
      if (!write) continue;

      const outcome = await this.applyRow(tenantId, row, write, local.defaultEnvironment);
      if (outcome.action === 'error') {
        counts.error += 1;
        consecutiveFailures += 1;
        if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
          // Something systematic is wrong. Stop rather than fill the table
          // with error rows and then report a successful run.
          throw new Error(
            `${CONSECUTIVE_FAILURE_LIMIT} objects in a row could not be saved, so the synchronisation was stopped. `
            + 'The technical details are in the server log.',
          );
        }
      } else {
        consecutiveFailures = 0;
        counts[outcome.action] += 1;
      }
    }

    return { counts, warnings };
  }

  /** Never lose the real reason a record could not be written. */
  private logRecordFailure(
    row: Pick<NetboxPlanRow, 'external_type' | 'external_id'> | ExistingLink,
    error: unknown,
  ): void {
    this.logger.warn(
      `Netbox ${row.external_type} ${row.external_id}: ${plainErrorMessage(error)}`,
      (error as Error)?.stack,
    );
  }

  /**
   * One Netbox object, one transaction. A failure here is recorded on that
   * object's row and the run carries on with the next one.
   */
  private async applyRow(
    tenantId: string,
    row: NetboxPlanRow,
    write: { asset: MappedAssetFields; hardware: MappedHardwareFields; assetId: string | null },
    defaultEnvironment: string,
  ): Promise<ApplyOutcome> {
    try {
      return await withTenantExecution(this.dataSource, tenantId, async (manager) => {
        const opts = { manager, tenantId, source: 'system', sourceRef: NETBOX_LINK_SOURCE };
        const warnings = [...row.warnings];
        let assetId = write.assetId;
        let action: 'create' | 'update' | 'unchanged' = row.action === 'create' ? 'create' : 'unchanged';

        if (!assetId) {
          const body = this.createBody(write.asset, defaultEnvironment);
          let created;
          try {
            created = await this.assets.create(body, tenantId, null, opts);
          } catch (error) {
            if (!isDuplicateIpRejection(error)) throw error;
            warnings.push(netboxNotice('ip_conflict_skipped', { value: write.asset.ip_addresses?.[0]?.ip ?? '' }));
            created = await this.assets.create({ ...body, ip_addresses: null }, tenantId, null, opts);
          }
          assetId = created.id;
          action = 'create';
        } else if (row.action === 'update') {
          const patch = this.updateBody(write.asset, row);
          if (Object.keys(patch).length > 0) {
            try {
              await this.assets.update(assetId, patch, tenantId, null, opts);
            } catch (error) {
              if (!isDuplicateIpRejection(error)) throw error;
              warnings.push(netboxNotice('ip_conflict_skipped', { value: write.asset.ip_addresses?.[0]?.ip ?? '' }));
              const { ip_addresses, ...rest } = patch as Record<string, unknown>;
              if (Object.keys(rest).length > 0) {
                await this.assets.update(assetId, rest, tenantId, null, opts);
              }
            }
            action = 'update';
          }
        }

        const hardware = this.hardwareBody(write.hardware, row, action === 'create');
        if (Object.keys(hardware).length > 0) {
          await this.assets.upsertHardwareInfo(assetId, hardware, tenantId, null, opts);
          if (action === 'unchanged') action = 'update';
        }

        // The "Netbox" link on the asset is written once, when the asset and
        // the Netbox object are first tied together.
        const existing = await manager.query(
          `SELECT id, asset_id FROM asset_external_links
           WHERE tenant_id = $1 AND source = $2 AND external_type = $3 AND external_id = $4`,
          [tenantId, NETBOX_LINK_SOURCE, row.external_type, row.external_id],
        );
        if (existing.length === 0 || existing[0].asset_id !== assetId) {
          await this.assets.createLink(assetId, { description: 'Netbox', url: row.external_url }, null, opts);
        }

        // The stale record goes BEFORE the new one is marked linked, so the
        // one-live-record-per-asset index is never momentarily violated.
        await this.dropStaleRecords(manager, tenantId, assetId, row);
        await this.upsertLink(tenantId, row, {
          assetId,
          state: 'linked',
          candidateAssetIds: [],
          // One record holds one notice; the preview carries the full list.
          notice: warnings[0] ?? null,
          synced: true,
        }, manager);

        return { action, assetId } as ApplyOutcome;
      });
    } catch (error) {
      this.logRecordFailure(row, error);
      const notice = objectFailureNotice(error);
      await this.upsertLink(tenantId, row, {
        assetId: null,
        state: 'error',
        candidateAssetIds: [],
        notice,
        synced: false,
      }).catch((linkError) => this.logRecordFailure(row, linkError));
      return { action: 'error', notice };
    }
  }

  /**
   * A device deleted and recreated in Netbox comes back under a new id, so the
   * asset would end up with the new record plus the old one. The old one has
   * nothing left to say: it is removed in the same transaction, BEFORE the new
   * record is marked linked, so the database's one-live-record-per-asset rule
   * is never broken even for an instant.
   *
   * Only a record flagged 'missing' is removed this way. A record still marked
   * 'linked' for the same asset would mean two live Netbox objects claim it,
   * which the planner refuses to produce.
   */
  private async dropStaleRecords(
    manager: EntityManager,
    tenantId: string,
    assetId: string,
    row: Pick<NetboxPlanRow, 'external_type' | 'external_id'>,
  ): Promise<void> {
    await manager.query(
      `DELETE FROM asset_external_links
       WHERE tenant_id = $1 AND source = $2 AND asset_id = $3 AND state = 'missing'
         AND NOT (external_type = $4 AND external_id = $5)`,
      [tenantId, NETBOX_LINK_SOURCE, assetId, row.external_type, row.external_id],
    );
  }

  /** Body for a new asset: every value Netbox owns, plus the configured environment. */
  private createBody(mapped: MappedAssetFields, defaultEnvironment: string): Record<string, unknown> {
    const body: Record<string, unknown> = {
      name: mapped.name,
      kind: mapped.kind,
      provider: mapped.provider,
      // The environment is set once, at creation, and never rewritten: Netbox
      // does not know about it.
      environment: defaultEnvironment,
      location_id: mapped.location_id,
    };
    if (mapped.status) body.status = mapped.status;
    if (mapped.hostname) body.hostname = mapped.hostname;
    // A domain without a host name is refused by the asset service.
    if (mapped.hostname && mapped.domain) body.domain = mapped.domain;
    if (mapped.operating_system) body.operating_system = mapped.operating_system;
    if (mapped.ip_addresses) body.ip_addresses = mapped.ip_addresses;
    return body;
  }

  /** Patch for an existing asset: only the fields the plan reported as different. */
  private updateBody(mapped: MappedAssetFields, row: NetboxPlanRow): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    for (const diff of row.diffs) {
      const field = ASSET_FIELD_BY_DIFF_KEY[diff.field];
      if (!field) continue;
      const value = mapped[field];
      if (value == null) continue;
      patch[field] = value;
    }
    // Changing the domain without sending a host name can leave the asset
    // without one, which the asset service refuses.
    if (patch.domain && !patch.hostname && mapped.hostname) {
      patch.hostname = mapped.hostname;
    }
    return patch;
  }

  private hardwareBody(
    hardware: MappedHardwareFields,
    row: NetboxPlanRow,
    isCreate: boolean,
  ): Record<string, unknown> {
    const changed = new Set(row.diffs.map((diff) => diff.field));
    const body: Record<string, unknown> = {};
    for (const field of HARDWARE_FIELDS) {
      const value = hardware[field];
      if (!value) continue;
      if (isCreate || changed.has(field)) body[field] = value;
    }
    return body;
  }

  // ==========================================================================
  // Link rows
  // ==========================================================================

  private async upsertLink(
    tenantId: string,
    row: Pick<NetboxPlanRow, 'external_type' | 'external_id' | 'external_name' | 'external_url'>,
    values: {
      assetId: string | null;
      state: AssetExternalLinkState;
      candidateAssetIds: string[];
      notice: NetboxNotice | null;
      synced: boolean;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (mg: EntityManager) => {
      await mg.query(
        `INSERT INTO asset_external_links
           (tenant_id, source, external_type, external_id, external_name, external_url,
            asset_id, state, candidate_asset_ids, message_code, message_params, last_seen_at, last_synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid[], $10, $11::jsonb, now(), ${values.synced ? 'now()' : 'NULL'})
         ON CONFLICT (tenant_id, source, external_type, external_id) DO UPDATE SET
           external_name = EXCLUDED.external_name,
           external_url = EXCLUDED.external_url,
           asset_id = EXCLUDED.asset_id,
           state = EXCLUDED.state,
           candidate_asset_ids = EXCLUDED.candidate_asset_ids,
           message_code = EXCLUDED.message_code,
           message_params = EXCLUDED.message_params,
           last_seen_at = now(),
           last_synced_at = ${values.synced ? 'now()' : 'asset_external_links.last_synced_at'},
           updated_at = now()`,
        [
          tenantId,
          NETBOX_LINK_SOURCE,
          row.external_type,
          row.external_id,
          row.external_name,
          row.external_url,
          values.assetId,
          values.state,
          values.candidateAssetIds,
          values.notice?.code ?? null,
          values.notice ? JSON.stringify(values.notice.params) : null,
        ],
      );
    };
    if (manager) {
      await run(manager);
      return;
    }
    await withTenantExecution(this.dataSource, tenantId, run);
  }

  private async touchIgnored(tenantId: string, row: NetboxPlanRow): Promise<void> {
    await withTenantExecution(this.dataSource, tenantId, (manager) => manager.query(
      `UPDATE asset_external_links
       SET external_name = $4, external_url = $5, last_seen_at = now(), updated_at = now()
       WHERE tenant_id = $1 AND source = $2 AND external_type = $3 AND external_id = $6`,
      [tenantId, NETBOX_LINK_SOURCE, row.external_type, row.external_name, row.external_url, row.external_id],
    ));
  }

  /**
   * Flags a record whose object Netbox no longer lists. A record that has no
   * asset either — its asset was deleted in KANAP and the object is gone from
   * Netbox — has nothing left to decide about, so it is removed instead of
   * being left behind as an orphan nobody can act on.
   */
  private async markMissing(tenantId: string, link: ExistingLink): Promise<void> {
    await withTenantExecution(this.dataSource, tenantId, async (manager) => {
      if (!link.asset_id) {
        await manager.query(
          `DELETE FROM asset_external_links
           WHERE tenant_id = $1 AND source = $2 AND id = $3 AND asset_id IS NULL`,
          [tenantId, NETBOX_LINK_SOURCE, link.id],
        );
        return;
      }
      await manager.query(
        `UPDATE asset_external_links
         SET state = 'missing', message_code = $4, message_params = NULL, updated_at = now()
         WHERE tenant_id = $1 AND source = $2 AND id = $3 AND state = 'linked'`,
        [tenantId, NETBOX_LINK_SOURCE, link.id, 'missing_from_netbox'],
      );
    });
  }

  // ==========================================================================
  // Row actions
  // ==========================================================================

  async resolveRecord(
    manager: EntityManager,
    tenantId: string,
    id: string,
    input: NetboxResolveInput,
  ): Promise<NetboxRecordRow> {
    const record = await this.findRecord(manager, tenantId, id);
    const action = String(input.action || '').trim();

    if (action === 'ignore') {
      await manager.query(
        `UPDATE asset_external_links
         SET state = 'ignored', message_code = NULL, message_params = NULL, updated_at = now()
         WHERE tenant_id = $1 AND source = $2 AND id = $3`,
        [tenantId, NETBOX_LINK_SOURCE, id],
      );
      return this.findRecord(manager, tenantId, id);
    }
    if (action !== 'link' && action !== 'create') {
      throw new BadRequestException('Choose whether to link this object to an asset, create a new asset, or ignore it.');
    }

    let assetId: string | null = null;
    if (action === 'link') {
      assetId = String(input.asset_id || '').trim() || null;
      if (!assetId) {
        throw new BadRequestException('Choose the asset this object belongs to.');
      }
      const found = await manager.query(
        `SELECT id FROM assets WHERE tenant_id = $1 AND id = $2`,
        [tenantId, assetId],
      );
      if (found.length === 0) {
        throw new NotFoundException('That asset does not exist any more.');
      }
      // One asset, one Netbox object. A record whose object disappeared from
      // Netbox does not hold the asset: the new object may take it over.
      const claimed = await manager.query(
        `SELECT external_name FROM asset_external_links
         WHERE tenant_id = $1 AND source = $2 AND asset_id = $3 AND state = 'linked' AND id <> $4
         LIMIT 1`,
        [tenantId, NETBOX_LINK_SOURCE, assetId, id],
      );
      if (claimed.length > 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'NETBOX_ASSET_ALREADY_LINKED',
          message: claimed[0].external_name
            ? `This asset is already linked to the Netbox object "${claimed[0].external_name}". Pick another asset, or create a new one.`
            : 'This asset is already linked to another Netbox object. Pick another asset, or create a new one.',
        });
      }
    }

    // Applying the Netbox values right away means reading the object again —
    // that one object, not the whole inventory.
    const local = await this.loadLocalContext(manager, tenantId);
    const connection = this.config.buildConnection(local.config);
    let object: NetboxObject;
    try {
      object = record.external_type === 'device'
        ? await this.client.getDevice(connection, record.external_id)
        : await this.client.getVirtualMachine(connection, record.external_id);
    } catch (error) {
      throw new BadRequestException(plainErrorMessage(error));
    }
    // The role and site matches still decide what the object may become.
    const mapping = mapNetboxObject(object, {
      roleMap: local.roleMap,
      siteMap: local.siteMap,
      defaultEnvironment: local.defaultEnvironment,
      catalogs: local.catalogs,
    });
    if (!mapping.asset || !mapping.hardware) {
      throw new BadRequestException(
        'This object is out of scope for the current matches. Match its role and its site first.',
      );
    }

    const existingAsset = assetId ? local.assets.find((asset) => asset.id === assetId) : undefined;
    const row: NetboxPlanRow = {
      external_type: record.external_type,
      external_id: record.external_id,
      external_name: object.name,
      external_url: object.url,
      action: assetId ? 'update' : 'create',
      asset: null,
      matched_by: null,
      candidates: [],
      diffs: existingAsset ? diffNetboxMapping(mapping, existingAsset, local.catalogs) : [],
      skip_reason: null,
      warnings: mapping.warnings,
    };
    const outcome = await this.applyRow(
      tenantId,
      row,
      { asset: mapping.asset, hardware: mapping.hardware, assetId },
      local.defaultEnvironment,
    );
    if (outcome.action === 'error') {
      throw new BadRequestException(outcome.notice.text);
    }
    return this.findRecord(manager, tenantId, id);
  }

  /**
   * Puts an ignored object back in the list. With an asset or with candidates
   * there is something to show; with neither, the record holds no information
   * at all, so it is removed and the object is judged afresh at the next run
   * rather than sitting in the "to decide" list with nothing to decide.
   */
  async unignoreRecord(manager: EntityManager, tenantId: string, id: string): Promise<NetboxRecordRow> {
    const record = await this.findRecord(manager, tenantId, id);
    if (record.state !== 'ignored') {
      return record;
    }
    if (record.asset) {
      // Another object may have taken the asset over while this one sat
      // ignored; the database would refuse a second live record for it.
      const claimed = await manager.query(
        `SELECT id FROM asset_external_links
         WHERE tenant_id = $1 AND source = $2 AND asset_id = $3 AND state = 'linked' AND id <> $4
         LIMIT 1`,
        [tenantId, NETBOX_LINK_SOURCE, record.asset.id, id],
      );
      if (claimed.length > 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'NETBOX_ASSET_ALREADY_LINKED',
          message: 'The asset this object was linked to now belongs to another Netbox object. '
            + 'Remove this record, or link it to a different asset.',
        });
      }
    }
    if (!record.asset && record.candidates.length === 0) {
      await manager.query(
        `DELETE FROM asset_external_links WHERE tenant_id = $1 AND source = $2 AND id = $3`,
        [tenantId, NETBOX_LINK_SOURCE, id],
      );
      return { ...record, message: netboxNotice('reevaluate_next_sync') };
    }
    await manager.query(
      `UPDATE asset_external_links
       SET state = CASE WHEN asset_id IS NULL THEN 'ambiguous' ELSE 'linked' END,
           message_code = CASE WHEN asset_id IS NULL THEN 'ambiguous_candidates' ELSE NULL END,
           message_params = NULL,
           updated_at = now()
       WHERE tenant_id = $1 AND source = $2 AND id = $3`,
      [tenantId, NETBOX_LINK_SOURCE, id],
    );
    return this.findRecord(manager, tenantId, id);
  }

  /** Retires the asset behind an object Netbox no longer lists. */
  async retireAsset(manager: EntityManager, tenantId: string, id: string, userId: string | null): Promise<NetboxRecordRow> {
    const record = await this.findRecord(manager, tenantId, id);
    if (record.state !== 'missing' || !record.asset) {
      throw new BadRequestException('Only an asset whose Netbox object has disappeared can be retired from here.');
    }
    // A person asked for this, so the audit entry keeps their name; the source
    // reference still says the decision came from the Netbox page.
    await this.assets.update(record.asset.id, { status: 'retired' }, tenantId, userId, {
      manager,
      tenantId,
      sourceRef: NETBOX_LINK_SOURCE,
    });
    return this.findRecord(manager, tenantId, id);
  }
}
