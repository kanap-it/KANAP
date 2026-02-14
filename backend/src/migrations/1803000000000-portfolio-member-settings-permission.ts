import { MigrationInterface, QueryRunner } from "typeorm";

export class PortfolioMemberSettingsPermission1803000000000 implements MigrationInterface {
  name = 'PortfolioMemberSettingsPermission1803000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    // Upgrade Portfolio Member role's portfolio_settings permission from 'reader' to 'member'
    // This allows portfolio members to add/edit contributors while only admins can delete
    await queryRunner.query(`
      UPDATE role_permissions rp
      SET level = 'member'
      FROM roles r
      WHERE rp.role_id = r.id
        AND r.role_name = 'Portfolio Member'
        AND rp.resource = 'portfolio_settings'
        AND rp.level = 'reader'
    `);

    // Re-enable RLS
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    // Revert Portfolio Member role's portfolio_settings permission back to 'reader'
    await queryRunner.query(`
      UPDATE role_permissions rp
      SET level = 'reader'
      FROM roles r
      WHERE rp.role_id = r.id
        AND r.role_name = 'Portfolio Member'
        AND rp.resource = 'portfolio_settings'
        AND rp.level = 'member'
    `);

    // Re-enable RLS
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }
}
