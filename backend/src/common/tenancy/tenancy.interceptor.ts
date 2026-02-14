import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TenancyManager } from './tenancy.manager';

/**
 * Interceptor that manages the transaction lifecycle for tenant-scoped requests.
 *
 * This interceptor:
 * 1. Commits the transaction on successful request completion
 * 2. Rolls back the transaction on error
 * 3. Releases the query runner connection
 */
@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor(private readonly tenancyManager: TenancyManager) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // If no tenant context, just pass through
    if (!this.tenancyManager.getTenantId()) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        // On successful completion, commit and release
        complete: async () => {
          try {
            if (this.tenancyManager.isTransactionActive()) {
              await this.tenancyManager.commit();
            }
          } catch (error) {
            console.error('[TenancyInterceptor] Commit failed:', error);
            // If commit fails, try to rollback
            try {
              await this.tenancyManager.rollback();
            } catch (rollbackError) {
              console.error('[TenancyInterceptor] Rollback after commit failure failed:', rollbackError);
            }
          } finally {
            try {
              await this.tenancyManager.release();
            } catch (releaseError) {
              console.error('[TenancyInterceptor] CRITICAL: Connection release failed:', releaseError);
            }
          }
        },
      }),
      catchError(async (error) => {
        // On error, rollback and release
        try {
          if (this.tenancyManager.isTransactionActive()) {
            await this.tenancyManager.rollback();
          }
        } catch (rollbackError) {
          console.error('[TenancyInterceptor] Rollback failed:', rollbackError);
        } finally {
          try {
            await this.tenancyManager.release();
          } catch (releaseError) {
            console.error('[TenancyInterceptor] CRITICAL: Connection release failed on error:', releaseError);
          }
        }

        // Re-throw the original error
        throw error;
      }),
    );
  }
}
