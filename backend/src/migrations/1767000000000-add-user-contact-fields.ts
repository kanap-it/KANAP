import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserContactFields1767000000000 implements MigrationInterface {
  name = 'AddUserContactFields1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "job_title" text NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "business_phone" text NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "mobile_phone" text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mobile_phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "business_phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "job_title"`);
  }
}
