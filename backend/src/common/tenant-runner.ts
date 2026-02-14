import { DataSource, EntityManager } from 'typeorm';

export async function withTenant<T>(
  dataSource: DataSource,
  tenantId: string,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
    const result = await fn(runner.manager);
    await runner.commitTransaction();
    return result;
  } catch (error) {
    try {
      await runner.rollbackTransaction();
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    try {
      await runner.release();
    } catch {
      // ignore release errors
    }
  }
}

