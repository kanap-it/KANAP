import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetTokens1846000000000 implements MigrationInterface {
  name = 'PasswordResetTokens1846000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        token_hash varchar(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_password_reset_tokens_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_tenant_user ON password_reset_tokens (tenant_id, user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at)`);
    await queryRunner.query(`ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'password_reset_tokens'
            AND policyname = 'password_reset_tokens_tenant_isolation'
        ) THEN
          DROP POLICY password_reset_tokens_tenant_isolation ON password_reset_tokens;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE POLICY password_reset_tokens_tenant_isolation ON password_reset_tokens
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
  }
}
