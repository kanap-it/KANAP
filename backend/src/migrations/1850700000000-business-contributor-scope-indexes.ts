import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessContributorScopeIndexes1850700000000 implements MigrationInterface {
  name = 'BusinessContributorScopeIndexes1850700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_owner_ids_gin ON tasks USING GIN (owner_ids)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_viewer_ids_gin ON tasks USING GIN (viewer_ids)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_creator ON tasks(tenant_id, creator_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_created_by ON portfolio_requests(tenant_id, created_by_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_application_owners_tenant_user_app ON application_owners(tenant_id, user_id, application_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_application_owners_tenant_user_app`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_created_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant_creator`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_viewer_ids_gin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_owner_ids_gin`);
  }
}
