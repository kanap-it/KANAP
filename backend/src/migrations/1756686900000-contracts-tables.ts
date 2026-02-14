import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContractsTables1756686900000 implements MigrationInterface {
  name = 'ContractsTables1756686900000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        status text NOT NULL DEFAULT 'enabled',
        company_id uuid NOT NULL,
        supplier_id uuid NOT NULL,
        owner_user_id uuid NULL,
        start_date date NOT NULL,
        duration_months int NOT NULL DEFAULT 12,
        auto_renewal boolean NOT NULL DEFAULT true,
        notice_period_months int NOT NULL DEFAULT 1,
        yearly_amount_at_signature numeric(18,2) NOT NULL DEFAULT 0,
        currency char(3) NOT NULL DEFAULT 'EUR',
        billing_frequency text NOT NULL DEFAULT 'annual',
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contracts_name ON contracts(name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_spend_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id uuid NOT NULL,
        spend_item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_contract_spend UNIQUE (contract_id, spend_item_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_spend_contract ON contract_spend_items(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_spend_item ON contract_spend_items(spend_item_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id uuid NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        due_date date NULL,
        assignee_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_tasks_contract ON contract_tasks(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_tasks_created ON contract_tasks(created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id uuid NOT NULL,
        description text NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_links_contract ON contract_links(contract_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id uuid NOT NULL,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NULL,
        size int NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract ON contract_attachments(contract_id)`);

    // Backfill join links from legacy spend_items.contract_id
    await queryRunner.query(`
      INSERT INTO contract_spend_items(contract_id, spend_item_id)
      SELECT contract_id, id FROM spend_items WHERE contract_id IS NOT NULL
      ON CONFLICT (contract_id, spend_item_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contract_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_tasks`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_spend_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS contracts`);
  }
}

