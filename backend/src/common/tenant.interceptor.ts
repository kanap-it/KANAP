import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { DataSource, QueryRunner } from 'typeorm';
import { finalize, mergeMap } from 'rxjs/operators';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { SKIP_TENANT_TRANSACTION_KEY } from './skip-tenant-transaction.decorator';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return next.handle();

    const skipTenantTransaction = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_TRANSACTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipTenantTransaction) return next.handle();

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
        const finishRunner = async (
          candidate: QueryRunner | undefined,
          labels: { commit: string; rollback: string; release: string },
        ) => {
          if (!candidate || candidate.isReleased) {
            return;
          }

          try {
            if (candidate.isTransactionActive) {
              try {
                await candidate.commitTransaction();
              } catch (commitError) {
                console.error(labels.commit, commitError);
                try {
                  if (candidate.isTransactionActive) {
                    await candidate.rollbackTransaction();
                  }
                } catch (rollbackError) {
                  console.error(labels.rollback, rollbackError);
                }
              }
            }
          } finally {
            if (!candidate.isReleased) {
              try {
                await candidate.release();
                (req as any)._tenantRunnerReleased = true;
              } catch (releaseError) {
                console.error(labels.release, releaseError);
              }
            }
          }
        };

        const activeRunner: QueryRunner | undefined = (req as any).queryRunner;
        if (activeRunner && activeRunner !== runner) {
          await finishRunner(activeRunner, {
            commit: '[TenantInterceptor] Swapped runner commit failed:',
            rollback: '[TenantInterceptor] Swapped runner rollback failed:',
            release: '[TenantInterceptor] CRITICAL: Swapped runner release failed:',
          });
          return;
        }

        if (!existing) {
          await finishRunner(runner, {
            commit: '[TenantInterceptor] Commit failed:',
            rollback: '[TenantInterceptor] Rollback failed:',
            release: '[TenantInterceptor] CRITICAL: Connection release failed:',
          });
        } else if (ownedByGuard) {
          await finishRunner(runner, {
            commit: '[TenantInterceptor] Guard-owned commit failed:',
            rollback: '[TenantInterceptor] Guard-owned rollback failed:',
            release: '[TenantInterceptor] CRITICAL: Guard-owned connection release failed:',
          });
        }
      }),
    );
  }
}
