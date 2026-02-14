import { MigrationInterface, QueryRunner } from 'typeorm';

export class RlsMissingTables1775000000000 implements MigrationInterface {
  name = 'RlsMissingTables1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add RLS to interface_connection_links
    await queryRunner.query(`ALTER TABLE interface_connection_links ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE interface_connection_links FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS interface_connection_links_tenant_isolation ON interface_connection_links`);
    await queryRunner.query(`
      CREATE POLICY interface_connection_links_tenant_isolation ON interface_connection_links
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);

    // Add RLS to application_support_contacts
    await queryRunner.query(`ALTER TABLE application_support_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE application_support_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS application_support_contacts_tenant_isolation ON application_support_contacts`);
    await queryRunner.query(`
      CREATE POLICY application_support_contacts_tenant_isolation ON application_support_contacts
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS application_support_contacts_tenant_isolation ON application_support_contacts`);
    await queryRunner.query(`ALTER TABLE application_support_contacts DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS interface_connection_links_tenant_isolation ON interface_connection_links`);
    await queryRunner.query(`ALTER TABLE interface_connection_links DISABLE ROW LEVEL SECURITY`);
  }
}
