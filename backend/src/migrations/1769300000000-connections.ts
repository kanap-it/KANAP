import { MigrationInterface, QueryRunner } from 'typeorm';

export class Connections1769300000000 implements MigrationInterface {
  name = 'Connections1769300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        connection_id text NOT NULL,
        name text NOT NULL,
        purpose text NULL,
        topology text NOT NULL,
        source_server_id uuid NULL,
        source_entity_code text NULL,
        destination_server_id uuid NULL,
        destination_entity_code text NULL,
        lifecycle text NOT NULL DEFAULT 'active',
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_connections_tenant_connection_id ON connections(tenant_id, connection_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connections_topology ON connections(tenant_id, topology);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connections_tenant ON connections(tenant_id);`);

    await queryRunner.query(`
      ALTER TABLE connections
      ADD CONSTRAINT fk_connections_source_server
      FOREIGN KEY (source_server_id) REFERENCES servers(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE connections
      ADD CONSTRAINT fk_connections_destination_server
      FOREIGN KEY (destination_server_id) REFERENCES servers(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connection_servers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        connection_id uuid NOT NULL,
        server_id uuid NOT NULL
      );
    `);

    await queryRunner.query(`
      ALTER TABLE connection_servers
      ADD CONSTRAINT fk_connection_servers_connection
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE connection_servers
      ADD CONSTRAINT fk_connection_servers_server
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_connection_servers ON connection_servers(tenant_id, connection_id, server_id);
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connection_servers_tenant ON connection_servers(tenant_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connection_protocols (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        connection_id uuid NOT NULL,
        connection_type_code text NOT NULL
      );
    `);

    await queryRunner.query(`
      ALTER TABLE connection_protocols
      ADD CONSTRAINT fk_connection_protocols_connection
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_connection_protocols ON connection_protocols(tenant_id, connection_id, connection_type_code);
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connection_protocols_tenant ON connection_protocols(tenant_id);`);

    // RLS
    await queryRunner.query(`ALTER TABLE connections ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE connections FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP POLICY IF EXISTS connections_isolation ON connections;`);
    await queryRunner.query(`
      CREATE POLICY connections_isolation ON connections
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid);
    `);

    await queryRunner.query(`ALTER TABLE connection_servers ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE connection_servers FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP POLICY IF EXISTS connection_servers_isolation ON connection_servers;`);
    await queryRunner.query(`
      CREATE POLICY connection_servers_isolation ON connection_servers
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid);
    `);

    await queryRunner.query(`ALTER TABLE connection_protocols ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE connection_protocols FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP POLICY IF EXISTS connection_protocols_isolation ON connection_protocols;`);
    await queryRunner.query(`
      CREATE POLICY connection_protocols_isolation ON connection_protocols
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS connection_protocols;`);
    await queryRunner.query(`DROP TABLE IF EXISTS connection_servers;`);
    await queryRunner.query(`DROP TABLE IF EXISTS connections;`);
  }
}
