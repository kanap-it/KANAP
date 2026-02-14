import { MigrationInterface, QueryRunner } from 'typeorm';

export class LifecycleAlignment1765005000000 implements MigrationInterface {
  name = 'LifecycleAlignment1765005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE servers SET status = 'active' WHERE status = 'enabled'`);
    await queryRunner.query(`UPDATE servers SET status = 'retired' WHERE status = 'disabled'`);
    await queryRunner.query(`ALTER TABLE servers ALTER COLUMN status SET DEFAULT 'active'`);

    await queryRunner.query(`UPDATE interfaces SET lifecycle = 'active' WHERE lifecycle = 'approved'`);
    await queryRunner.query(`UPDATE interface_bindings SET status = 'active' WHERE status = 'approved'`);
    await queryRunner.query(`UPDATE interface_bindings SET status = 'active' WHERE LOWER(status) = 'paused'`);
    await queryRunner.query(`UPDATE interface_bindings SET status = 'active' WHERE LOWER(status) = 'enabled'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE interface_bindings SET status = 'approved' WHERE status = 'active'`);
    await queryRunner.query(`UPDATE interfaces SET lifecycle = 'approved' WHERE lifecycle = 'active'`);

    await queryRunner.query(`ALTER TABLE servers ALTER COLUMN status SET DEFAULT 'enabled'`);
    await queryRunner.query(`UPDATE servers SET status = 'enabled' WHERE status = 'active'`);
    await queryRunner.query(`UPDATE servers SET status = 'disabled' WHERE status = 'retired'`);
  }
}
