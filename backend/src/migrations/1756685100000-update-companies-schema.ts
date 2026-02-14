import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCompaniesSchema1756685100000 implements MigrationInterface {
  name = 'UpdateCompaniesSchema1756685100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Handle existing null values before setting NOT NULL
    await queryRunner.query(`UPDATE "companies" SET "country_iso" = 'XX' WHERE "country_iso" IS NULL`);
    await queryRunner.query(`UPDATE "companies" SET "city" = 'Unknown' WHERE "city" IS NULL`);
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "country_iso" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "city" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "fiscal_year_end"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD "fiscal_year_end" character(7)`);
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "city" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "country_iso" DROP NOT NULL`);
  }
}
