import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropItUsersTurnoverFromCompanies1756686400000 implements MigrationInterface {
  name = 'DropItUsersTurnoverFromCompanies1756686400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "it_users"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "turnover"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN "it_users" integer`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN "turnover" numeric(18,3)`);
  }
}

