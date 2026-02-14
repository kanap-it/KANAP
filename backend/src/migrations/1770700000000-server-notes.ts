import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServerNotes1770700000000 implements MigrationInterface {
  name = 'ServerNotes1770700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE servers
      ADD COLUMN IF NOT EXISTS notes text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE servers DROP COLUMN IF EXISTS notes;`);
  }
}
