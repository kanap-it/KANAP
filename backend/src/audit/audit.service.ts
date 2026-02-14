import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './audit.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(params: {
    table: string;
    recordId?: string | null;
    action: 'create' | 'update' | 'disable' | 'delete';
    before?: any | null;
    after?: any | null;
    userId?: string | null;
  }, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(AuditLog);
    const entry = repo.create({
      table_name: params.table,
      record_id: params.recordId ?? null,
      action: params.action,
      before_json: params.before ?? null,
      after_json: params.after ?? null,
      user_id: params.userId ?? null,
    });
    await repo.save(entry);
  }
}
