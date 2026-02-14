import { MigrationInterface, QueryRunner } from "typeorm";

export class EntraSso1766000000000 implements MigrationInterface {
  name = 'EntraSso1766000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_provider text NOT NULL DEFAULT 'none'`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS entra_tenant_id text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enabled boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS entra_metadata jsonb DEFAULT '{}'::jsonb`);

    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_auth_provider text`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_subject text`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_external_auth
      ON users(tenant_id, external_auth_provider, external_subject)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'i'
            AND c.relname = 'uq_users_external_auth'
            AND n.nspname = 'public'
        ) THEN
          CREATE UNIQUE INDEX uq_users_external_auth
          ON users(tenant_id, external_auth_provider, external_subject)
          WHERE external_auth_provider IS NOT NULL
            AND external_subject IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_users_external_auth`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_external_auth`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS external_subject`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS external_auth_provider`);

    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS entra_metadata`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS sso_enabled`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS entra_tenant_id`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS sso_provider`);
  }
}

