import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestOriginTask1831000000000 implements MigrationInterface {
  name = 'AddRequestOriginTask1831000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS origin_task_id uuid NULL
      REFERENCES tasks(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_origin_task
      ON portfolio_requests(tenant_id, origin_task_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_requests_origin_task
      ON portfolio_requests(origin_task_id)
      WHERE origin_task_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_portfolio_requests_origin_task`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_origin_task`);
    await queryRunner.query(`ALTER TABLE portfolio_requests DROP COLUMN IF EXISTS origin_task_id`);
  }
}
