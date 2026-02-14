import { MigrationInterface, QueryRunner } from "typeorm";

export class CoaColumns1758807100000 implements MigrationInterface {
  name = 'CoaColumns1758807100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Companies.coa_id
    await queryRunner.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS coa_id uuid NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_companies_coa_id ON companies(coa_id)`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'companies' AND constraint_name = 'fk_companies_coa_id'
      ) THEN
        ALTER TABLE companies ADD CONSTRAINT fk_companies_coa_id FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;
      END IF;
    END $$;`);

    // Accounts.coa_id
    await queryRunner.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS coa_id uuid NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_coa_id ON accounts(coa_id)`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'accounts' AND constraint_name = 'fk_accounts_coa_id'
      ) THEN
        ALTER TABLE accounts ADD CONSTRAINT fk_accounts_coa_id FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;
      END IF;
    END $$;`);

    // Switch unique constraint to include coa_id
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'accounts' AND c.conname = 'uq_accounts_tenant_number'
      ) THEN
        ALTER TABLE accounts DROP CONSTRAINT uq_accounts_tenant_number;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'accounts' AND c.conname = 'uq_accounts_tenant_coa_number'
      ) THEN
        ALTER TABLE accounts ADD CONSTRAINT uq_accounts_tenant_coa_number UNIQUE (tenant_id, coa_id, account_number);
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS uq_accounts_tenant_coa_number`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'accounts' AND c.conname = 'uq_accounts_tenant_number'
      ) THEN
        ALTER TABLE accounts ADD CONSTRAINT uq_accounts_tenant_number UNIQUE (tenant_id, account_number);
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS fk_accounts_coa_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_accounts_coa_id`);
    await queryRunner.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS coa_id`);

    await queryRunner.query(`ALTER TABLE companies DROP CONSTRAINT IF EXISTS fk_companies_coa_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_coa_id`);
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS coa_id`);
  }
}

