import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServerClusters1770600000000 implements MigrationInterface {
  name = 'ServerClusters1770600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE servers
      ADD COLUMN IF NOT EXISTS is_cluster boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS server_cluster_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        cluster_id uuid NOT NULL,
        server_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE server_cluster_members
      ADD CONSTRAINT fk_server_cluster_members_cluster
      FOREIGN KEY (cluster_id) REFERENCES servers(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE server_cluster_members
      ADD CONSTRAINT fk_server_cluster_members_server
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_server_cluster_members
        ON server_cluster_members(tenant_id, cluster_id, server_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_server_cluster_members_cluster
        ON server_cluster_members(tenant_id, cluster_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_server_cluster_members_server
        ON server_cluster_members(tenant_id, server_id);
    `);

    await queryRunner.query(`ALTER TABLE server_cluster_members ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE server_cluster_members FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP POLICY IF EXISTS server_cluster_members_isolation ON server_cluster_members;`);
    await queryRunner.query(`
      CREATE POLICY server_cluster_members_isolation ON server_cluster_members
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS server_cluster_members;`);
    await queryRunner.query(`ALTER TABLE servers DROP COLUMN IF EXISTS is_cluster;`);
  }
}
