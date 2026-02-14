import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionLegs1770500000000 implements MigrationInterface {
  name = 'ConnectionLegs1770500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connection_legs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        connection_id uuid NOT NULL,
        order_index integer NOT NULL,
        layer_type text NOT NULL,
        source_server_id uuid NULL,
        source_entity_code text NULL,
        destination_server_id uuid NULL,
        destination_entity_code text NULL,
        protocol_code text NOT NULL,
        port_override text NULL,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_connection
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_source_server
      FOREIGN KEY (source_server_id) REFERENCES servers(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_destination_server
      FOREIGN KEY (destination_server_id) REFERENCES servers(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_connection_legs_order ON connection_legs(tenant_id, connection_id, order_index);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_connection_legs_tenant_connection ON connection_legs(tenant_id, connection_id);
    `);

    await queryRunner.query(`ALTER TABLE connection_legs ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE connection_legs FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP POLICY IF EXISTS connection_legs_isolation ON connection_legs;`);
    await queryRunner.query(`
      CREATE POLICY connection_legs_isolation ON connection_legs
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS connection_legs;`);
  }
}
