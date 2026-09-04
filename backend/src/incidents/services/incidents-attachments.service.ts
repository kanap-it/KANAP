import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Incident } from '../incident.entity';
import { IncidentAttachment } from '../incident-attachment.entity';
import { AuditService } from '../../audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { validateUploadedFile } from '../../common/upload-validation';
import { fixMulterFilename } from '../../common/upload';
import { IncidentsBaseService, ServiceOpts } from './incidents-base.service';

/**
 * Incident attachments. Deletion is a soft delete: the file stays, the list hides it.
 */
@Injectable()
export class IncidentsAttachmentsService extends IncidentsBaseService {
  constructor(
    @InjectRepository(Incident) incidentRepo: Repository<Incident>,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {
    super(incidentRepo);
  }

  async listAttachments(incidentId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureIncident(incidentId, mg, tenantId, opts?.viewer);
    return mg.getRepository(IncidentAttachment).find({
      where: { incident_id: incidentId, tenant_id: tenantId, deleted_at: IsNull() },
      order: { uploaded_at: 'DESC' },
    });
  }

  async uploadAttachment(incidentId: string, file: Express.Multer.File, userId: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    if (!file) throw new BadRequestException('No file uploaded');

    const incident = await this.ensureIncident(incidentId, mg, tenantId, opts?.viewer);
    this.assertEditable(incident);

    const buf = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer as any);
    if (!buf) throw new BadRequestException('Empty upload');
    const decodedName = fixMulterFilename(file.originalname);
    const validated = validateUploadedFile({
      originalName: decodedName,
      mimeType: (file as any).mimetype,
      buffer: buf as Buffer,
      size: (file as any).size,
    });
    const originalName = decodedName || `attachment${validated.extension}`;
    const storedSafe = `${randomUUID()}_${originalName}`;
    const keySafe = path.posix.join('files', incident.tenant_id, 'incidents', incidentId, storedSafe);

    await this.storage.putObject({
      key: keySafe,
      body: buf as Buffer,
      contentType: validated.mimeType,
      contentLength: validated.size,
      sse: 'AES256',
    });

    const repo = mg.getRepository(IncidentAttachment);
    const saved = await repo.save(repo.create({
      tenant_id: incident.tenant_id,
      incident_id: incidentId,
      original_filename: originalName,
      stored_filename: storedSafe,
      mime_type: validated.mimeType || null,
      size: validated.size,
      storage_path: keySafe,
      uploaded_by: userId,
    }));

    await this.audit.log(
      { table: 'incident_attachments', recordId: saved.id, action: 'create', before: null, after: saved, userId },
      { manager: mg },
    );
    return saved;
  }

  /**
   * Attachment metadata for download.
   */
  async downloadAttachment(attachmentId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    const found = await mg.getRepository(IncidentAttachment).findOne({
      where: { id: attachmentId, tenant_id: tenantId, deleted_at: IsNull() },
    });
    if (!found) throw new NotFoundException('Attachment not found');
    await this.ensureIncident(found.incident_id, mg, tenantId, opts?.viewer);
    return found;
  }

  async deleteAttachment(attachmentId: string, userId: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    const repo = mg.getRepository(IncidentAttachment);
    const found = await repo.findOne({ where: { id: attachmentId, tenant_id: tenantId, deleted_at: IsNull() } });
    if (!found) return { ok: true };

    const incident = await this.ensureIncident(found.incident_id, mg, tenantId, opts?.viewer);
    this.assertEditable(incident);

    const before = { ...found };
    found.deleted_at = new Date();
    const saved = await repo.save(found);
    await this.audit.log(
      { table: 'incident_attachments', recordId: saved.id, action: 'delete', before, after: saved, userId },
      { manager: mg },
    );
    return { ok: true };
  }
}
