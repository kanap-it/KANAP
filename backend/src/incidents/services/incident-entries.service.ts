import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Incident } from '../incident.entity';
import { parseCreateEntry } from '../dto';
import { IncidentsBaseService, ServiceOpts, userNameSql } from './incidents-base.service';

const ENTRY_COLUMNS = `
  e.id, e.incident_id, e.kind, e.content, e.changed_fields, e.occurred_at,
  e.author_id, ${userNameSql('u')} AS author_name, e.created_at`;

const ENTRY_FROM = `
  FROM incident_entries e
  LEFT JOIN users u ON u.id = e.author_id AND u.tenant_id = e.tenant_id`;

/**
 * Append-only journal: list + notes. Change entries are written by the other services.
 */
@Injectable()
export class IncidentEntriesService extends IncidentsBaseService {
  constructor(@InjectRepository(Incident) incidentRepo: Repository<Incident>) {
    super(incidentRepo);
  }

  async list(incidentId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureIncident(incidentId, mg, tenantId);
    return mg.query(
      `SELECT ${ENTRY_COLUMNS} ${ENTRY_FROM}
       WHERE e.incident_id = $1 AND e.tenant_id = $2
       ORDER BY e.occurred_at DESC, e.created_at DESC`,
      [incidentId, tenantId],
    );
  }

  /**
   * Add a note. `occurred_at` defaults to now; refused when the incident is closed.
   */
  async createNote(incidentId: string, body: unknown, userId: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    const dto = parseCreateEntry(body);
    const incident = await this.ensureIncident(incidentId, mg, tenantId);
    this.assertEditable(incident);

    const entry = await this.addEntry(mg, incident, {
      kind: 'note',
      content: dto.content,
      occurred_at: dto.occurred_at ? new Date(dto.occurred_at) : undefined,
      author_id: userId,
    });
    return this.getEntry(entry.id, mg, tenantId);
  }

  private async getEntry(entryId: string, manager: EntityManager, tenantId: string) {
    const [row] = await manager.query(
      `SELECT ${ENTRY_COLUMNS} ${ENTRY_FROM} WHERE e.id = $1 AND e.tenant_id = $2`,
      [entryId, tenantId],
    );
    return row;
  }
}
