import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTurnoverScaleTo3dp1756686200000 implements MigrationInterface {
  name = 'UpdateTurnoverScaleTo3dp1756686200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "turnover" TYPE numeric(18,3)`);
    await queryRunner.query(`ALTER TABLE "company_metrics" ALTER COLUMN "turnover" TYPE numeric(18,3)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_metrics" ALTER COLUMN "turnover" TYPE numeric(18,2)`);
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "turnover" TYPE numeric(18,2)`);
  }
}

