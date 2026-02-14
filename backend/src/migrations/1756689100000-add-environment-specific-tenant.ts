import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnvironmentSpecificTenant1756689100000 implements MigrationInterface {
  name = 'AddEnvironmentSpecificTenant1756689100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // No-op: tenant seeding removed for open-source release
    // Existing deployments already have their tenants; new installs create tenants via subscription or DEFAULT_TENANT_SLUG
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove kanap tenant (but only if it has no associated data)
    await queryRunner.query(`
      DELETE FROM tenants 
      WHERE slug = 'kanap' 
      AND NOT EXISTS (
        SELECT 1 FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'kanap')
      )
    `);
  }
}
