import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropHeadcountFromCompanies1756686300000 implements MigrationInterface {
  name = 'DropHeadcountFromCompanies1756686300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Some deployments may have NOT NULL or default; just drop the column
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "headcount"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN "headcount" integer`);
  }
}

