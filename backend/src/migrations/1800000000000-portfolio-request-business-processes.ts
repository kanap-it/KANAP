import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioRequestBusinessProcesses1800000000000 implements MigrationInterface {
  name = 'PortfolioRequestBusinessProcesses1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Request Business Processes junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_business_processes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        business_process_id uuid NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, business_process_id)
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX idx_prbp_tenant ON portfolio_request_business_processes(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_prbp_request ON portfolio_request_business_processes(request_id)`);
    await queryRunner.query(`CREATE INDEX idx_prbp_business_process ON portfolio_request_business_processes(business_process_id)`);

    // Enable RLS
    await queryRunner.query(`ALTER TABLE portfolio_request_business_processes ENABLE ROW LEVEL SECURITY`);

    // RLS Policy for tenant isolation
    await queryRunner.query(`
      CREATE POLICY portfolio_request_business_processes_tenant_isolation ON portfolio_request_business_processes
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS portfolio_request_business_processes_tenant_isolation ON portfolio_request_business_processes`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_request_business_processes`);
  }
}
