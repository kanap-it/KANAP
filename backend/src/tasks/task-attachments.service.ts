import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TaskAttachment } from './task-attachment.entity';
import { StorageService } from '../common/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { validateUploadedFile } from '../common/upload-validation';
import { fixMulterFilename } from '../common/upload';

@Injectable()
export class TaskAttachmentsService {
  constructor(
    @InjectRepository(TaskAttachment)
    private readonly repo: Repository<TaskAttachment>,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async listAttachments(taskId: string, opts?: { manager?: EntityManager }): Promise<TaskAttachment[]> {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(TaskAttachment);
    // Exclude inline images (source_field IS NOT NULL) - they're managed via rich text editor
    return attachRepo
      .createQueryBuilder('a')
      .where('a.task_id = :taskId', { taskId })
      .andWhere('a.source_field IS NULL')
      .orderBy('a.uploaded_at', 'DESC')
      .getMany();
  }

  async uploadAttachment(
    taskId: string,
    file: Express.Multer.File,
    userId?: string,
    opts?: { manager?: EntityManager },
  ): Promise<TaskAttachment> {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(TaskAttachment);

    if (!file) throw new BadRequestException('No file uploaded');

    const [{ tenant_id }] = await mg.query(`SELECT app_current_tenant() AS tenant_id`);
    const id = randomUUID();
    const now = new Date();
    const decodedName = fixMulterFilename(file.originalname);
    const ext = path.extname(decodedName || '') || '';
    const rand = Math.random().toString(36).slice(2, 8);
    const key = [
      'files', tenant_id, 'tasks', taskId,
      now.getUTCFullYear().toString(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${id}_${rand}${ext}`,
    ].join('/');

    const buf = file.buffer ?? ((file as any).path ? fs.readFileSync((file as any).path) : null);
    if (!buf) throw new BadRequestException('Empty upload');
    const validated = validateUploadedFile({
      originalName: decodedName,
      mimeType: file.mimetype,
      buffer: buf as Buffer,
      size: file.size,
    });

    await this.storage.putObject({
      key,
      body: buf,
      contentType: validated.mimeType,
      contentLength: validated.size,
      sse: 'AES256',
    });

    const attachment = attachRepo.create({
      id,
      tenant_id,
      task_id: taskId,
      original_filename: decodedName || `${id}${ext}`,
      stored_filename: path.basename(key),
      mime_type: validated.mimeType as any,
      size: validated.size,
      storage_path: key,
      uploaded_by_id: userId || null,
    });

    const saved = await attachRepo.save(attachment as any);
    await this.audit.log(
      { table: 'task_attachments', recordId: saved.id, action: 'create', before: null, after: saved, userId },
      { manager: mg },
    );
    return saved;
  }

  async getAttachment(
    attachmentId: string,
    opts?: { manager?: EntityManager },
  ): Promise<TaskAttachment> {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(TaskAttachment);
    const found = await attachRepo.findOne({ where: { id: attachmentId } });
    if (!found) throw new NotFoundException('Attachment not found');
    return found;
  }

  async deleteAttachment(
    attachmentId: string,
    userId?: string,
    opts?: { manager?: EntityManager },
  ): Promise<{ ok: boolean }> {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(TaskAttachment);
    const found = await attachRepo.findOne({ where: { id: attachmentId } });
    if (!found) throw new NotFoundException('Attachment not found');

    try {
      await this.storage.deleteObject(found.storage_path);
    } catch {
      // Ignore storage errors during delete
    }

    await attachRepo.remove(found);
    await this.audit.log(
      { table: 'task_attachments', recordId: found.id, action: 'delete', before: found, after: null, userId },
      { manager: mg },
    );
    return { ok: true };
  }
}
