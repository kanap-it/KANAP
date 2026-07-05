import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiSingleFreeMessageLimit1853390000000 implements MigrationInterface {
  name = 'AiSingleFreeMessageLimit1853390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Single-plan pricing: every cloud tenant gets the same built-in AI free message
    // volume. The per-plan rows (small/standard/max) are a heritage of the previous
    // plans and are no longer read; the quota is the one 'default' row (1500/month),
    // editable on the platform admin page. Code falls back to 1500 when the row is
    // absent, so this seed is a convenience, not a correctness requirement.
    await queryRunner.query(`
      INSERT INTO platform_ai_plan_limits (plan_name, monthly_message_limit)
      VALUES ('default', 1500)
      ON CONFLICT (plan_name) DO NOTHING
    `);
    await queryRunner.query(`
      DELETE FROM platform_ai_plan_limits WHERE plan_name IN ('small', 'standard', 'max')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO platform_ai_plan_limits (plan_name, monthly_message_limit)
      VALUES ('small', 500), ('standard', 1500), ('max', 2500)
      ON CONFLICT (plan_name) DO NOTHING
    `);
    await queryRunner.query(`
      DELETE FROM platform_ai_plan_limits WHERE plan_name = 'default'
    `);
  }
}
