import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two facts the users table could not express:
 * - last_login_at: stamped on every session creation (local + SSO); "Never"
 *   when null. Answers "who is dormant / who never signed in".
 * - external_synced_at: last time directory-owned fields were written from
 *   Microsoft Entra (login-time enrichment or the scheduled sync).
 */
export class UserLoginAndDirectorySyncTimestamps1853430000000 implements MigrationInterface {
  name = 'UserLoginAndDirectorySyncTimestamps1853430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_synced_at timestamptz NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS external_synced_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS last_login_at`);
  }
}
