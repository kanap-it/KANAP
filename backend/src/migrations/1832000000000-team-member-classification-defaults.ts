import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamMemberClassificationDefaults1832000000000 implements MigrationInterface {
  name = 'TeamMemberClassificationDefaults1832000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
        ADD COLUMN IF NOT EXISTS default_source_id uuid,
        ADD COLUMN IF NOT EXISTS default_category_id uuid,
        ADD COLUMN IF NOT EXISTS default_stream_id uuid,
        ADD COLUMN IF NOT EXISTS default_company_id uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
        DROP COLUMN IF EXISTS default_company_id,
        DROP COLUMN IF EXISTS default_stream_id,
        DROP COLUMN IF EXISTS default_category_id,
        DROP COLUMN IF EXISTS default_source_id
    `);
  }
}
