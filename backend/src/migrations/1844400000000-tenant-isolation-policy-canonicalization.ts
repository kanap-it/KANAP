import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_POLICY_FIXUPS = [
  {
    table: 'asset_cluster_members',
    policies: [
      'server_cluster_members_isolation',
      'asset_cluster_members_isolation',
      'asset_cluster_members_tenant_isolation',
    ],
  },
  {
    table: 'connection_legs',
    policies: [
      'connection_legs_isolation',
      'connection_legs_tenant_isolation',
    ],
  },
  {
    table: 'connection_protocols',
    policies: [
      'connection_protocols_isolation',
      'connection_protocols_tenant_isolation',
    ],
  },
  {
    table: 'connection_servers',
    policies: [
      'connection_servers_isolation',
      'connection_servers_tenant_isolation',
    ],
  },
  {
    table: 'connections',
    policies: [
      'connections_isolation',
      'connections_tenant_isolation',
    ],
  },
  {
    table: 'currency_rate_sets',
    policies: [
      'currency_rate_sets_isolation',
      'currency_rate_sets_tenant_isolation',
    ],
  },
  {
    table: 'refresh_tokens',
    policies: [
      'refresh_tokens_tenant_policy',
      'refresh_tokens_tenant_isolation',
    ],
  },
] as const;

function canonicalTenantPolicySql(table: string) {
  return `
    CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (tenant_id = app_current_tenant())
    WITH CHECK (tenant_id = app_current_tenant())
  `;
}

export class TenantIsolationPolicyCanonicalization1844400000000 implements MigrationInterface {
  name = 'TenantIsolationPolicyCanonicalization1844400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, policies } of TABLE_POLICY_FIXUPS) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);

      for (const policy of policies) {
        await queryRunner.query(`DROP POLICY IF EXISTS ${policy} ON ${table}`);
      }

      await queryRunner.query(canonicalTenantPolicySql(table));
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Repair-only migration: intentionally left in place.
  }
}
