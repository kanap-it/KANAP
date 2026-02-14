import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentMetrics1756686600000 implements MigrationInterface {
  name = 'CreateDepartmentMetrics1756686600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS department_metrics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        fiscal_year integer NOT NULL,
        headcount integer NOT NULL,
        is_frozen boolean NOT NULL DEFAULT false,
        frozen_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(department_id, fiscal_year)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_department_metrics_dept_year ON department_metrics(department_id, fiscal_year)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_department_metrics_dept_year`);
    await queryRunner.query(`DROP TABLE IF EXISTS department_metrics`);
  }
}

