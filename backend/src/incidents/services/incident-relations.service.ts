import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityTarget, In, ObjectLiteral, Repository } from 'typeorm';
import { Incident } from '../incident.entity';
import { IncidentAsset } from '../incident-asset.entity';
import { IncidentApplication } from '../incident-application.entity';
import { AuditService } from '../../audit/audit.service';
import { IncidentsBaseService, ServiceOpts } from './incidents-base.service';

export type IncidentLinkedObject = { id: string; name: string; reference: string | null };

type LinkSpec = {
  /** Sentence-case label used in the journal ("Assets linked: …"). */
  label: string;
  /** Key in `changed_fields`. */
  key: 'assets' | 'applications';
  entity: EntityTarget<ObjectLiteral>;
  linkTable: 'incident_assets' | 'incident_applications';
  linkColumn: 'asset_id' | 'application_id';
  targetTable: 'assets' | 'applications';
  /** Business reference column shown next to the name. */
  referenceColumn: 'asset_reference' | 'sequential_id';
};

const ASSET_LINK: LinkSpec = {
  label: 'Assets',
  key: 'assets',
  entity: IncidentAsset,
  linkTable: 'incident_assets',
  linkColumn: 'asset_id',
  targetTable: 'assets',
  referenceColumn: 'asset_reference',
};

const APPLICATION_LINK: LinkSpec = {
  label: 'Applications',
  key: 'applications',
  entity: IncidentApplication,
  linkTable: 'incident_applications',
  linkColumn: 'application_id',
  targetTable: 'applications',
  referenceColumn: 'sequential_id',
};

const displayRef = (item: IncidentLinkedObject): string => item.reference || item.name;

/**
 * Linked assets / applications, replaced as a whole and journaled as one `link_change` entry.
 */
@Injectable()
export class IncidentRelationsService extends IncidentsBaseService {
  constructor(
    @InjectRepository(Incident) incidentRepo: Repository<Incident>,
    private readonly audit: AuditService,
  ) {
    super(incidentRepo);
  }

  listAssets(incidentId: string, opts?: ServiceOpts): Promise<IncidentLinkedObject[]> {
    return this.listLinked(ASSET_LINK, incidentId, opts);
  }

  bulkReplaceAssets(incidentId: string, assetIds: string[], userId: string | null, opts?: ServiceOpts) {
    return this.bulkReplace(ASSET_LINK, incidentId, assetIds, userId, opts);
  }

  listApplications(incidentId: string, opts?: ServiceOpts): Promise<IncidentLinkedObject[]> {
    return this.listLinked(APPLICATION_LINK, incidentId, opts);
  }

  bulkReplaceApplications(incidentId: string, applicationIds: string[], userId: string | null, opts?: ServiceOpts) {
    return this.bulkReplace(APPLICATION_LINK, incidentId, applicationIds, userId, opts);
  }

  private async listLinked(spec: LinkSpec, incidentId: string, opts?: ServiceOpts): Promise<IncidentLinkedObject[]> {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureIncident(incidentId, mg, tenantId);
    return mg.query(
      `SELECT t.id, t.name, t.${spec.referenceColumn} AS reference
       FROM ${spec.linkTable} l
       JOIN ${spec.targetTable} t ON t.id = l.${spec.linkColumn} AND t.tenant_id = l.tenant_id
       WHERE l.incident_id = $1 AND l.tenant_id = $2
       ORDER BY t.name ASC`,
      [incidentId, tenantId],
    );
  }

  private async bulkReplace(
    spec: LinkSpec,
    incidentId: string,
    rawIds: string[],
    userId: string | null,
    opts?: ServiceOpts,
  ): Promise<IncidentLinkedObject[]> {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    const incident = await this.ensureIncident(incidentId, mg, tenantId);
    this.assertEditable(incident);

    const nextIds = Array.from(new Set((rawIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    const targets: IncidentLinkedObject[] = nextIds.length
      ? await mg.query(
          `SELECT id, name, ${spec.referenceColumn} AS reference
           FROM ${spec.targetTable}
           WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
          [nextIds, tenantId],
        )
      : [];
    if (targets.length !== nextIds.length) {
      throw new BadRequestException(`One or more ${spec.label.toLowerCase()} not found`);
    }

    const current = await this.listLinked(spec, incidentId, { manager: mg, tenantId });
    const currentIds = new Set(current.map((item) => item.id));
    const wantedIds = new Set(nextIds);
    const removed = current.filter((item) => !wantedIds.has(item.id));
    const added = targets.filter((item) => !currentIds.has(item.id));
    if (removed.length === 0 && added.length === 0) return current;

    const repo = mg.getRepository(spec.entity);
    if (removed.length) {
      await repo.delete({ incident_id: incident.id, tenant_id: tenantId, [spec.linkColumn]: In(removed.map((item) => item.id)) });
    }
    if (added.length) {
      await repo.save(added.map((item) => repo.create({ tenant_id: tenantId, incident_id: incident.id, [spec.linkColumn]: item.id })));
    }

    const next = await this.listLinked(spec, incidentId, { manager: mg, tenantId });
    const parts: string[] = [];
    if (added.length) parts.push(`${spec.label} linked: ${added.map(displayRef).join(', ')}`);
    if (removed.length) parts.push(`${spec.label} unlinked: ${removed.map(displayRef).join(', ')}`);
    await this.addEntry(mg, incident, {
      kind: 'link_change',
      content: `${parts.join('. ')}.`,
      changed_fields: { [spec.key]: { from: current.map(displayRef), to: next.map(displayRef) } },
      author_id: userId,
    });
    await this.audit.log(
      {
        table: spec.linkTable,
        recordId: incident.id,
        action: 'update',
        before: current.map((item) => item.id),
        after: next.map((item) => item.id),
        userId,
      },
      { manager: mg },
    );
    return next;
  }
}
