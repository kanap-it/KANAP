import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiSearchTeamIndexes1844500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_portfolio_project_team_tenant_project ON portfolio_project_team(tenant_id, project_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_portfolio_request_team_tenant_request ON portfolio_request_team(tenant_id, request_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_request_team_tenant_request`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_project_team_tenant_project`);
  }
}
