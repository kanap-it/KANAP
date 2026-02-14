import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOperatingSystemToServers1769100000000 implements MigrationInterface {
  name = 'AddOperatingSystemToServers1769100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE servers ADD COLUMN IF NOT EXISTS operating_system text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE servers DROP COLUMN IF EXISTS operating_system`);
  }
}
