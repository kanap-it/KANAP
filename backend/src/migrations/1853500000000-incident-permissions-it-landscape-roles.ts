import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grants the `incidents` resource to the IT Landscape built-in roles.
 *
 * The register shipped in `1853440000000-incident-register`, but no tenant that
 * already existed at that point came out of it with a usable grant, and no
 * tenant at all got one below the Administrator tier. Three defects, all closed
 * here:
 *
 *  1. That migration's backfill filtered on `r.is_system = true`, yet the
 *     IT Landscape roles are created with `is_built_in = true` — `roles.service`
 *     only marks `Administrator` and `Contact` as system roles. The clause
 *     matched no IT Landscape row.
 *  2. It disabled RLS on `role_permissions` but not on `roles`, which is
 *     `FORCE ROW LEVEL SECURITY`. With no `app.current_tenant` set inside a
 *     migration, its `FROM roles r` read back nothing regardless of (1).
 *  3. `BUILT_IN_ROLES` in `tenants.service` listed `incidents` only on
 *     `IT Landscape Administrator`, so Member and Reader had no access to the
 *     register — not even read — on any tenant, however recently created.
 *
 * `Administrator` is deliberately absent below: it is a system role that is
 * granted every resource in `RESOURCES` at boot (`main.ts`), which is why it
 * was the only way into the register while this was broken.
 *
 * Rows that already exist are left alone (`rp.id IS NULL`), so a tenant that
 * granted `incidents` by hand as a workaround keeps the level it chose rather
 * than having it reset to the built-in default.
 */
const INCIDENT_ROLE_LEVELS = [
  { role: 'it landscape administrator', level: 'admin' },
  { role: 'it landscape member', level: 'member' },
  { role: 'it landscape reader', level: 'reader' },
] as const;

export class IncidentPermissionsItLandscapeRoles1853500000000 implements MigrationInterface {
  name = 'IncidentPermissionsItLandscapeRoles1853500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    for (const { role, level } of INCIDENT_ROLE_LEVELS) {
      await queryRunner.query(
        `
          INSERT INTO role_permissions (tenant_id, role_id, resource, level)
          SELECT r.tenant_id, r.id, 'incidents', $2
          FROM roles r
          LEFT JOIN role_permissions rp
            ON rp.role_id = r.id
           AND rp.resource = 'incidents'
          WHERE r.is_built_in = true
            AND LOWER(TRIM(r.role_name)) = $1
            AND rp.id IS NULL
        `,
        [role, level],
      );
    }

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverts to the pre-fix state: the register becomes Administrator-only again.
    // A level set by hand on one of these roles goes with it — up() could not tell
    // it apart from a grant of its own, so it is not preserved on the way back.
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(
      `
        DELETE FROM role_permissions rp
        USING roles r
        WHERE rp.role_id = r.id
          AND rp.resource = 'incidents'
          AND r.is_built_in = true
          AND LOWER(TRIM(r.role_name)) IN ($1, $2, $3)
      `,
      INCIDENT_ROLE_LEVELS.map((entry) => entry.role),
    );

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }
}
