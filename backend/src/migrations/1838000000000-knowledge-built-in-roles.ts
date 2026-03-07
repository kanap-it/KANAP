import { MigrationInterface, QueryRunner } from 'typeorm';

const KNOWLEDGE_ROLES = [
  {
    name: 'Knowledge Administrator',
    description: 'Full control over knowledge documents, libraries, types, and folders',
    level: 'admin',
  },
  {
    name: 'Knowledge Member',
    description: 'Can create, edit, and relate knowledge documents',
    level: 'member',
  },
  {
    name: 'Knowledge Reader',
    description: 'Read-only access to knowledge documents',
    level: 'reader',
  },
] as const;

export class KnowledgeBuiltInRoles1838000000000 implements MigrationInterface {
  name = 'KnowledgeBuiltInRoles1838000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rlsTables = ['roles', 'role_permissions', 'user_roles'];
    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    for (const role of KNOWLEDGE_ROLES) {
      await queryRunner.query(
        `
          INSERT INTO roles (tenant_id, role_name, role_description, is_built_in)
          SELECT t.id, $1, $2, true
          FROM tenants t
          ON CONFLICT (tenant_id, role_name)
          DO UPDATE
            SET role_description = EXCLUDED.role_description,
                is_built_in = true
        `,
        [role.name, role.description],
      );

      await queryRunner.query(
        `
          INSERT INTO role_permissions (tenant_id, role_id, resource, level)
          SELECT r.tenant_id, r.id, 'knowledge', $2
          FROM roles r
          WHERE r.role_name = $1
          ON CONFLICT (role_id, resource)
          DO UPDATE
            SET level = EXCLUDED.level,
                tenant_id = EXCLUDED.tenant_id
        `,
        [role.name, role.level],
      );
    }

    await queryRunner.query(
      `
        WITH assigned_roles AS (
          SELECT DISTINCT tenant_id, user_id, role_id
          FROM user_roles
        ),
        current_access AS (
          SELECT
            ar.tenant_id,
            ar.user_id,
            MAX(
              CASE rp.level
                WHEN 'admin' THEN 3
                WHEN 'member' THEN 2
                WHEN 'contributor' THEN 1
                WHEN 'reader' THEN 1
                ELSE 0
              END
            ) AS rank
          FROM assigned_roles ar
          JOIN roles r
            ON r.id = ar.role_id
           AND r.tenant_id = ar.tenant_id
          JOIN role_permissions rp
            ON rp.role_id = r.id
           AND rp.tenant_id = ar.tenant_id
           AND rp.resource = 'knowledge'
          GROUP BY ar.tenant_id, ar.user_id
        ),
        surviving_access AS (
          SELECT
            ar.tenant_id,
            ar.user_id,
            MAX(
              CASE rp.level
                WHEN 'admin' THEN 3
                WHEN 'member' THEN 2
                WHEN 'contributor' THEN 1
                WHEN 'reader' THEN 1
                ELSE 0
              END
            ) AS rank
          FROM assigned_roles ar
          JOIN roles r
            ON r.id = ar.role_id
           AND r.tenant_id = ar.tenant_id
          JOIN role_permissions rp
            ON rp.role_id = r.id
           AND rp.tenant_id = ar.tenant_id
           AND rp.resource = 'knowledge'
          WHERE NOT (
            r.is_built_in = true
            AND r.role_name NOT IN ('Knowledge Administrator', 'Knowledge Member', 'Knowledge Reader')
          )
          GROUP BY ar.tenant_id, ar.user_id
        ),
        users_needing_backfill AS (
          SELECT
            ca.tenant_id,
            ca.user_id,
            ca.rank AS target_rank
          FROM current_access ca
          LEFT JOIN surviving_access sa
            ON sa.tenant_id = ca.tenant_id
           AND sa.user_id = ca.user_id
          WHERE ca.rank > COALESCE(sa.rank, 0)
        )
        INSERT INTO user_roles (tenant_id, user_id, role_id, is_primary)
        SELECT
          unf.tenant_id,
          unf.user_id,
          r.id,
          false
        FROM users_needing_backfill unf
        JOIN roles r
          ON r.tenant_id = unf.tenant_id
         AND r.role_name = CASE unf.target_rank
           WHEN 3 THEN 'Knowledge Administrator'
           WHEN 2 THEN 'Knowledge Member'
           ELSE 'Knowledge Reader'
         END
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
    );

    await queryRunner.query(
      `
        DELETE FROM role_permissions rp
        USING roles r
        WHERE rp.role_id = r.id
          AND rp.resource = 'knowledge'
          AND r.is_built_in = true
          AND r.role_name NOT IN ('Knowledge Administrator', 'Knowledge Member', 'Knowledge Reader')
      `,
    );

    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(): Promise<void> {
    // Irreversible: this migration converts bundled knowledge access into dedicated built-in roles
    // and backfills user-role assignments to preserve access.
  }
}
