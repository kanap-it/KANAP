import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiMutationPreviews1844900000000 implements MigrationInterface {
  name = 'AiMutationPreviews1844900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_mutation_previews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tool_name text NOT NULL,
        target_entity_type text NOT NULL,
        target_entity_id uuid,
        mutation_input jsonb NOT NULL,
        current_values jsonb,
        status text NOT NULL DEFAULT 'pending',
        approved_at timestamptz,
        rejected_at timestamptz,
        executed_at timestamptz,
        expires_at timestamptz NOT NULL,
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_previews_tenant_conversation
      ON ai_mutation_previews(tenant_id, conversation_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_previews_tenant_status_expires
      ON ai_mutation_previews(tenant_id, status, expires_at)
    `);

    await queryRunner.query(`ALTER TABLE ai_mutation_previews ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_mutation_previews FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_mutation_previews_tenant_isolation ON ai_mutation_previews`);
    await queryRunner.query(`
      CREATE POLICY ai_mutation_previews_tenant_isolation ON ai_mutation_previews
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ai_mutation_previews_tenant_isolation ON ai_mutation_previews`);
    await queryRunner.query(`ALTER TABLE ai_mutation_previews NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_mutation_previews DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_mutation_previews`);
  }
}
