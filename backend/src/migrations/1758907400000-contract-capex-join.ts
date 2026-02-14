import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContractCapexJoin1758907400000 implements MigrationInterface {
  name = 'ContractCapexJoin1758907400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_capex_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        contract_id uuid NOT NULL,
        capex_item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_contract_capex UNIQUE (contract_id, capex_item_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_capex_contract ON contract_capex_items(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_capex_item ON contract_capex_items(capex_item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_capex_tenant ON contract_capex_items(tenant_id)`);

    await queryRunner.query(`ALTER TABLE contract_capex_items ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE contract_capex_items FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' AND tablename = 'contract_capex_items' AND policyname = 'contract_capex_items_tenant_isolation'
        ) THEN
          DROP POLICY contract_capex_items_tenant_isolation ON contract_capex_items;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE POLICY contract_capex_items_tenant_isolation ON contract_capex_items
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contract_capex_items`);
  }
}

