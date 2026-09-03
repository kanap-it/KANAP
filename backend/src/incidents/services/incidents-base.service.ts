import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Incident } from '../incident.entity';
import { IncidentChangedFields, IncidentEntry, IncidentEntryKind } from '../incident-entry.entity';

/**
 * Common options for service methods.
 */
export interface ServiceOpts {
  manager?: EntityManager;
  tenantId?: string;
}

export const INCIDENT_LOCKED_MESSAGE = 'This incident is closed. Reopen it to make changes.';

/** "First Last" for a `users` alias; falls back to the email when both names are empty. */
export function userNameSql(alias: string): string {
  return `COALESCE(NULLIF(TRIM(CONCAT(${alias}.first_name, ' ', ${alias}.last_name)), ''), ${alias}.email)`;
}

export function incidentRef(itemNumber: number): string {
  return `INC-${itemNumber}`;
}

/**
 * Base class with shared utilities for incident services.
 */
export abstract class IncidentsBaseService {
  constructor(protected readonly incidentRepo: Repository<Incident>) {}

  protected getManager(opts?: ServiceOpts): EntityManager {
    return opts?.manager ?? this.incidentRepo.manager;
  }

  protected ensureTenantId(tenantId?: string): string {
    const normalized = String(tenantId || '').trim();
    if (!normalized) {
      throw new BadRequestException('Tenant context is required');
    }
    return normalized;
  }

  async ensureIncident(id: string, manager: EntityManager, tenantId: string): Promise<Incident> {
    const incident = await manager.getRepository(Incident).findOne({ where: { id, tenant_id: tenantId } });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  /**
   * Closure lock: closed and cancelled incidents refuse every write until reopened.
   */
  protected assertEditable(incident: Incident): void {
    if (incident.status === 'closed' || incident.status === 'cancelled') {
      throw new ForbiddenException(INCIDENT_LOCKED_MESSAGE);
    }
  }

  /**
   * Load an incident and refuse when it is locked. Used by every write path.
   */
  async ensureEditable(id: string, opts?: ServiceOpts): Promise<Incident> {
    const incident = await this.ensureIncident(id, this.getManager(opts), this.ensureTenantId(opts?.tenantId));
    this.assertEditable(incident);
    return incident;
  }

  /**
   * Append a timeline entry. `created_at` is always server time.
   */
  protected addEntry(
    manager: EntityManager,
    incident: Incident,
    entry: {
      kind: IncidentEntryKind;
      content?: string | null;
      changed_fields?: IncidentChangedFields | null;
      occurred_at?: Date;
      author_id: string | null;
    },
  ): Promise<IncidentEntry> {
    const repo = manager.getRepository(IncidentEntry);
    return repo.save(repo.create({
      tenant_id: incident.tenant_id,
      incident_id: incident.id,
      kind: entry.kind,
      content: entry.content ?? null,
      changed_fields: entry.changed_fields ?? null,
      occurred_at: entry.occurred_at ?? new Date(),
      author_id: entry.author_id,
    }));
  }
}
