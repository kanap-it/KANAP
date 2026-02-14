import { MigrationInterface, QueryRunner } from "typeorm";

export class TrialSignupsTable1756689000000 implements MigrationInterface {
  name = 'TrialSignupsTable1756689000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trial_signups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_name text NOT NULL,
        slug citext NOT NULL UNIQUE,
        email citext NOT NULL,
        token_hash text,
        expires_at timestamptz,
        activated_at timestamptz,
        last_email_sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS trial_signups_token_hash_key
      ON trial_signups (token_hash)
      WHERE token_hash IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS trial_signups_email_idx
      ON trial_signups (email)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS trial_signups_email_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS trial_signups_token_hash_key`);
    await queryRunner.query(`DROP TABLE IF EXISTS trial_signups`);
  }
}
