import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TenantExecutionOptions, withTenantExecution } from '../../common/tenant-runner';
import { AiExecutionContext, AiExecutionContextWithManager } from '../ai.types';

@Injectable()
export class AiTenantExecutionService {
  constructor(private readonly dataSource: DataSource) {}

  async run<T>(
    tenantId: string,
    fn: (manager: EntityManager) => Promise<T>,
    opts?: TenantExecutionOptions,
  ): Promise<T> {
    return withTenantExecution(this.dataSource, tenantId, fn, opts);
  }

  async runWithContext<T>(
    context: AiExecutionContext,
    fn: (managedContext: AiExecutionContextWithManager) => Promise<T>,
    opts?: TenantExecutionOptions,
  ): Promise<T> {
    return this.run(
      context.tenantId,
      (manager) => fn({ ...context, manager }),
      opts,
    );
  }
}
