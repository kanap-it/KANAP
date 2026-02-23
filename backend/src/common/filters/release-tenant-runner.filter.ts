import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryRunner } from 'typeorm';
import { attachErrorToResponse } from '../../admin/ops/request-metrics.middleware';

@Catch()
export class ReleaseTenantRunnerFilter extends BaseExceptionFilter {
  constructor(adapter?: any) {
    super(adapter as any);
  }
  async catch(exception: any, host: ArgumentsHost) {
    try {
      const ctx = host.switchToHttp();
      const req: any = ctx.getRequest();
      const res: any = ctx.getResponse();
      const runner: QueryRunner | undefined = req?.queryRunner;

      // Attach error details for the ops metrics middleware to pick up
      if (res && exception) attachErrorToResponse(res, exception);
      const already = !!req?._tenantRunnerReleased;
      if (runner && !already) {
        try {
          // Roll back any active transaction to avoid keeping the connection in a bad state
          if ((runner as any).isTransactionActive) {
            try {
              await runner.rollbackTransaction();
            } catch (rollbackError) {
              // eslint-disable-next-line no-console
              console.error('[ReleaseTenantRunnerFilter] Rollback failed during exception handling:', rollbackError);
            }
          }
        } finally {
          try {
            if (!(runner as any).isReleased) {
              await runner.release();
            }
            req._tenantRunnerReleased = true;
          } catch (releaseError) {
            // eslint-disable-next-line no-console
            console.error('[ReleaseTenantRunnerFilter] CRITICAL: Connection release failed during exception handling:', releaseError);
          }
        }
      }
    } catch (cleanupError) {
      // eslint-disable-next-line no-console
      console.error('[ReleaseTenantRunnerFilter] Cleanup error:', cleanupError);
    }

    return super.catch(exception, host);
  }
}
