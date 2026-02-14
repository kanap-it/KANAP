import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { DataSource, QueryRunner } from 'typeorm';
import { finalize, mergeMap } from 'rxjs/operators';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req: any = http.getRequest();
    const tenantId: string | undefined = req?.tenant?.id;
    if (!tenantId) return next.handle();

    // Reuse runner if a guard already created it; otherwise create here
    const existing: QueryRunner | undefined = (req as any).queryRunner;
    const ownedByGuard: boolean = !!(req as any)._tenantRunnerOwner;
    const runner: QueryRunner = existing ?? this.dataSource.createQueryRunner();
    return from((async () => {
      if (!existing) {
        await runner.connect();
        await runner.startTransaction();
        await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
        (req as any).queryRunner = runner;
      }
      return true;
    })()).pipe(
      mergeMap(() => next.handle()),
      finalize(async () => {
        if (!existing) {
          try {
            await runner.commitTransaction();
          } catch (commitError) {
            console.error('[TenantInterceptor] Commit failed:', commitError);
            try {
              await runner.rollbackTransaction();
            } catch (rollbackError) {
              console.error('[TenantInterceptor] Rollback failed:', rollbackError);
            }
          } finally {
            try {
              await runner.release();
              (req as any)._tenantRunnerReleased = true;
            } catch (releaseError) {
              console.error('[TenantInterceptor] CRITICAL: Connection release failed:', releaseError);
            }
          }
        } else if (ownedByGuard) {
          try {
            await runner.commitTransaction();
          } catch (commitError) {
            console.error('[TenantInterceptor] Guard-owned commit failed:', commitError);
            try {
              await runner.rollbackTransaction();
            } catch (rollbackError) {
              console.error('[TenantInterceptor] Guard-owned rollback failed:', rollbackError);
            }
          } finally {
            try {
              await runner.release();
              (req as any)._tenantRunnerReleased = true;
            } catch (releaseError) {
              console.error('[TenantInterceptor] CRITICAL: Guard-owned connection release failed:', releaseError);
            }
          }
        }
      }),
    );
  }
}
