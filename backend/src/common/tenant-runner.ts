import { DataSource, EntityManager } from 'typeorm';

export type TenantExecutionOptions = {
  transaction?: boolean;
};

async function setTenantContext(
  runner: ReturnType<DataSource['createQueryRunner']>,
  tenantId: string,
  useTransactionLocalScope: boolean,
) {
  await runner.query(
    `SELECT set_config('app.current_tenant', $1, ${useTransactionLocalScope ? 'true' : 'false'})`,
    [tenantId],
  );
}

async function clearSessionTenantContext(
  runner: ReturnType<DataSource['createQueryRunner']>,
) {
  await runner.query(`SELECT set_config('app.current_tenant', '', false)`);
}

export async function withTenantExecution<T>(
  dataSource: DataSource,
  tenantId: string,
  fn: (manager: EntityManager) => Promise<T>,
  opts?: TenantExecutionOptions,
): Promise<T> {
  const useTransaction = opts?.transaction !== false;
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    if (useTransaction) {
      await runner.startTransaction();
    }
    await setTenantContext(runner, tenantId, useTransaction);
    const result = await fn(runner.manager);
    if (useTransaction && runner.isTransactionActive) {
      await runner.commitTransaction();
    }
    return result;
  } catch (error) {
    try {
      if (useTransaction && runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    try {
      if (!useTransaction) {
        await clearSessionTenantContext(runner);
      }
    } catch {
      // ignore tenant reset errors
    }
    try {
      await runner.release();
    } catch {
      // ignore release errors
    }
  }
}

export async function withTenant<T>(
  dataSource: DataSource,
  tenantId: string,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return withTenantExecution(dataSource, tenantId, fn, { transaction: true });
}
