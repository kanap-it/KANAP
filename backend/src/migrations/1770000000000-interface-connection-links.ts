import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterfaceConnectionLinks1770000000000 implements MigrationInterface {
  name = 'InterfaceConnectionLinks1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE interface_connection_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_binding_id uuid NOT NULL,
        connection_id uuid NOT NULL,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_connection_link UNIQUE (tenant_id, interface_binding_id, connection_id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_interface_connection_links_binding ON interface_connection_links(tenant_id, interface_binding_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_interface_connection_links_connection ON interface_connection_links(tenant_id, connection_id);`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_connection_links_binding'
        ) THEN
          ALTER TABLE interface_connection_links
          ADD CONSTRAINT fk_interface_connection_links_binding FOREIGN KEY (interface_binding_id) REFERENCES interface_bindings(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_connection_links_connection'
        ) THEN
          ALTER TABLE interface_connection_links
          ADD CONSTRAINT fk_interface_connection_links_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS interface_connection_links;`);
  }
}
