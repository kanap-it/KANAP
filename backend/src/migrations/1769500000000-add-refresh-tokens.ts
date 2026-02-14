import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1769500000000 implements MigrationInterface {
  name = 'AddRefreshTokens1769500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tenant_id UUID NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
    `);

    // Enable RLS
    await queryRunner.query(`ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;`);

    await queryRunner.query(`
      CREATE POLICY refresh_tokens_tenant_policy ON refresh_tokens
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS refresh_tokens_tenant_policy ON refresh_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens;`);
  }
}
