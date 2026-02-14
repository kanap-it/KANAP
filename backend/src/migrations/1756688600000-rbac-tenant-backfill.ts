import { MigrationInterface, QueryRunner } from "typeorm";

export class RbacTenantBackfill1756688600000 implements MigrationInterface {
  name = 'RbacTenantBackfill1756688600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily relax RLS on RBAC + users to repair data across tenants
    const tables = ['roles','role_permissions','users'];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Ensure per-tenant Administrator and Contact roles exist
    await queryRunner.query(`
      INSERT INTO roles(tenant_id, role_name, role_description, is_system)
      SELECT t.id, 'Administrator', 'Full system administrator with access to all features', true
      FROM tenants t
      LEFT JOIN roles r ON r.tenant_id = t.id AND r.role_name = 'Administrator'
      WHERE r.id IS NULL;
    `);
    await queryRunner.query(`
      INSERT INTO roles(tenant_id, role_name, role_description, is_system)
      SELECT t.id, 'Contact', 'Directory contact without app access by default', true
      FROM tenants t
      LEFT JOIN roles r ON r.tenant_id = t.id AND r.role_name = 'Contact'
      WHERE r.id IS NULL;
    `);

    // Grant Administrator admin level on all resources per tenant
    const resources = [
      'opex','capex','projects','contracts','suppliers','companies','departments','accounts','users','reporting','settings','billing'
    ];
    for (const res of resources) {
      await queryRunner.query(`
        INSERT INTO role_permissions(tenant_id, role_id, resource, level)
        SELECT r.tenant_id, r.id, '${res}', 'admin'
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = '${res}'
        WHERE r.role_name = 'Administrator' AND rp.id IS NULL;
      `);
    }

    // Remap users.role_id to the matching role name within their tenant
    await queryRunner.query(`
      UPDATE users u
      SET role_id = newr.id
      FROM roles oldr
      JOIN roles newr ON newr.role_name = oldr.role_name
      WHERE u.role_id = oldr.id AND newr.tenant_id = u.tenant_id AND u.role_id <> newr.id;
    `);

    // Re-enable RLS
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No destructive rollback; keep repaired data
  }
}
