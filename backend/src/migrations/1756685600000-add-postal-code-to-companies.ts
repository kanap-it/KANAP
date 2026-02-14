import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostalCodeToCompanies1756685600000 implements MigrationInterface {
  name = 'AddPostalCodeToCompanies1756685600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN "postal_code" text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "postal_code"`);
  }
}

