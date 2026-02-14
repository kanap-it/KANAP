import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNetworkSegmentToServers1769200000000 implements MigrationInterface {
  name = 'AddNetworkSegmentToServers1769200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE servers ADD COLUMN IF NOT EXISTS network_segment text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE servers DROP COLUMN IF EXISTS network_segment`);
  }
}
