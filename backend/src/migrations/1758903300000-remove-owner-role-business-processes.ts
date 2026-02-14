import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOwnerRoleBusinessProcesses1758903300000 implements MigrationInterface {
  name = 'RemoveOwnerRoleBusinessProcesses1758903300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_processes
      DROP COLUMN IF EXISTS owner_role;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_processes
      ADD COLUMN IF NOT EXISTS owner_role text;
    `);
  }
}

