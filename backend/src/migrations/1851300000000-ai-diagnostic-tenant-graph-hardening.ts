import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiDiagnosticTenantGraphHardening1851300000000 implements MigrationInterface {
  name = 'AiDiagnosticTenantGraphHardening1851300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_ai_diagnostic_tenant_graph()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_TABLE_NAME = 'ai_observations' THEN
          IF NEW.run_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_observations run_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_recommendations' THEN
          IF NEW.run_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_recommendations run_id must belong to the same tenant';
          END IF;
          IF NEW.observation_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_observations WHERE id = NEW.observation_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_recommendations observation_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_decisions' THEN
          IF NEW.run_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_decisions run_id must belong to the same tenant';
          END IF;
          IF NEW.recommendation_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_recommendations WHERE id = NEW.recommendation_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_decisions recommendation_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_evaluations' THEN
          IF NEW.run_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_evaluations run_id must belong to the same tenant';
          END IF;
          IF NEW.recommendation_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_recommendations WHERE id = NEW.recommendation_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_evaluations recommendation_id must belong to the same tenant';
          END IF;
          IF NEW.decision_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_decisions WHERE id = NEW.decision_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_evaluations decision_id must belong to the same tenant';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;
    `);

    for (const table of ['ai_observations', 'ai_recommendations', 'ai_decisions', 'ai_evaluations']) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${table}_tenant_graph ON ${table}`);
      await queryRunner.query(`
        CREATE TRIGGER trg_${table}_tenant_graph
        BEFORE INSERT OR UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION enforce_ai_diagnostic_tenant_graph()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['ai_evaluations', 'ai_decisions', 'ai_recommendations', 'ai_observations']) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${table}_tenant_graph ON ${table}`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS enforce_ai_diagnostic_tenant_graph()`);
  }
}
