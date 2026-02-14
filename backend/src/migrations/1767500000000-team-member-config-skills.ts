import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamMemberConfigSkills1767500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add skills column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    // Add notes column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DROP COLUMN IF EXISTS notes`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DROP COLUMN IF EXISTS skills`);
  }
}
