import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiMutationPlans1846300000000 implements MigrationInterface {
  name = 'AiMutationPlans1846300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_mutation_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        conversation_id uuid NULL,
        user_id uuid NOT NULL,
        summary text NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_plans_tenant_conversation
      ON ai_mutation_plans(tenant_id, conversation_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_plans_tenant_status
      ON ai_mutation_plans(tenant_id, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_mutation_plan_steps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        conversation_id uuid NULL,
        user_id uuid NOT NULL,
        plan_id uuid NOT NULL REFERENCES ai_mutation_plans(id) ON DELETE CASCADE,
        step_key text NOT NULL,
        label text NULL,
        tool_name text NOT NULL,
        input jsonb NOT NULL,
        depends_on jsonb NOT NULL DEFAULT '[]'::jsonb,
        preview_id uuid NULL REFERENCES ai_mutation_previews(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'waiting_dependency',
        error_message text NULL,
        result_entity_type text NULL,
        result_entity_id uuid NULL,
        result_ref text NULL,
        result_title text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, plan_id, step_key)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_plan_steps_tenant_plan
      ON ai_mutation_plan_steps(tenant_id, plan_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_plan_steps_tenant_preview
      ON ai_mutation_plan_steps(tenant_id, preview_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_mutation_plan_steps_tenant_status
      ON ai_mutation_plan_steps(tenant_id, status)
    `);

    await queryRunner.query(`ALTER TABLE ai_mutation_plans ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_mutation_plans FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_mutation_plans_tenant_isolation ON ai_mutation_plans`);
    await queryRunner.query(`
      CREATE POLICY ai_mutation_plans_tenant_isolation ON ai_mutation_plans
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);

    await queryRunner.query(`ALTER TABLE ai_mutation_plan_steps ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_mutation_plan_steps FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_mutation_plan_steps_tenant_isolation ON ai_mutation_plan_steps`);
    await queryRunner.query(`
      CREATE POLICY ai_mutation_plan_steps_tenant_isolation ON ai_mutation_plan_steps
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ai_mutation_plan_steps_tenant_isolation ON ai_mutation_plan_steps`);
    await queryRunner.query(`ALTER TABLE ai_mutation_plan_steps NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_mutation_plan_steps DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_mutation_plan_steps`);

    await queryRunner.query(`DROP POLICY IF EXISTS ai_mutation_plans_tenant_isolation ON ai_mutation_plans`);
    await queryRunner.query(`ALTER TABLE ai_mutation_plans NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_mutation_plans DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_mutation_plans`);
  }
}
