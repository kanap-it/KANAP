import { Injectable } from '@nestjs/common';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { TasksUnifiedService } from '../../tasks/tasks-unified.service';
import { ServiceOpts } from './incidents-base.service';
import { IncidentEntriesService } from './incident-entries.service';
import { IncidentRelationsService } from './incident-relations.service';
import { IncidentsAttachmentsService } from './incidents-attachments.service';
import { IncidentsService } from './incidents.service';

export type IncidentRecordOpts = ServiceOpts & { userId?: string | null };

/**
 * One loader for a complete incident record. Chat detail and the PDF report both consume this.
 */
@Injectable()
export class IncidentRecordService {
  constructor(
    private readonly incidents: IncidentsService,
    private readonly entries: IncidentEntriesService,
    private readonly relations: IncidentRelationsService,
    private readonly attachments: IncidentsAttachmentsService,
    private readonly tasks: TasksUnifiedService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async load(id: string, opts: IncidentRecordOpts) {
    const incident = await this.incidents.get(id, opts);
    const [entries, assets, applications, tasks, documents, attachments] = await Promise.all([
      this.entries.list(id, { ...opts, order: 'asc' }),
      this.relations.listAssets(id, opts),
      this.relations.listApplications(id, opts),
      this.tasks.listForTarget({ type: 'incident', id }, { manager: opts.manager }),
      this.knowledge.listDocumentsForEntity('incidents', id, {
        manager: opts.manager,
        userId: opts.userId ?? null,
      }),
      this.attachments.listAttachments(id, opts),
    ]);
    return { incident, entries, assets, applications, tasks, documents, attachments };
  }
}
