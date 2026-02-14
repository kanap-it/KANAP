import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1756684800000 implements MigrationInterface {
  name = 'Init1756684800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE TYPE input_grain AS ENUM ('annual','quarterly','monthly')`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        country_iso char(2),
        city text,
        address text,
        reg_number text,
        vat_number text,
        fiscal_year_end char(7), -- YYYY-MM
        base_currency char(3),
        headcount integer,
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code text NOT NULL,
        name text NOT NULL,
        description text,
        parent_department_id uuid NULL REFERENCES departments(id),
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(company_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NULL REFERENCES companies(id) ON DELETE SET NULL,
        department_id uuid NULL REFERENCES departments(id) ON DELETE SET NULL,
        first_name text,
        last_name text,
        email text NOT NULL UNIQUE,
        password_hash text,
        role text NOT NULL DEFAULT 'Viewer',
        mfa_enabled boolean NOT NULL DEFAULT false,
        mfa_secret text NULL,
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        erp_supplier_id text,
        commercial_contact text,
        technical_contact text,
        support_contact text,
        notes text,
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_classifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        description text
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_number text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        classification_id uuid NULL REFERENCES account_classifications(id),
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        code char(3) PRIMARY KEY,
        name text
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fx_rates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        base_code char(3) NOT NULL REFERENCES currencies(code),
        quote_code char(3) NOT NULL REFERENCES currencies(code),
        rate_date date NOT NULL,
        rate numeric(18,6) NOT NULL,
        UNIQUE (base_code, quote_code, rate_date)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spread_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        type text NOT NULL DEFAULT 'system',
        weights_json jsonb NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        product_name text NOT NULL,
        description text,
        supplier_id uuid NULL REFERENCES suppliers(id) ON DELETE SET NULL,
        account_id uuid NOT NULL REFERENCES accounts(id),
        currency char(3) NOT NULL REFERENCES currencies(code),
        payment_terms text,
        effective_start date NOT NULL,
        effective_end date,
        status text NOT NULL DEFAULT 'enabled',
        owner_it_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        owner_business_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        mgmt_classification text,
        project_id uuid NULL,
        contract_id uuid NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        spend_item_id uuid NOT NULL REFERENCES spend_items(id) ON DELETE CASCADE,
        version_name text NOT NULL,
        input_grain input_grain NOT NULL DEFAULT 'annual',
        is_approved boolean NOT NULL DEFAULT false,
        as_of_date date NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (spend_item_id, version_name)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_amounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        version_id uuid NOT NULL REFERENCES spend_versions(id) ON DELETE CASCADE,
        period date NOT NULL,
        planned numeric(18,2) DEFAULT 0,
        forecast numeric(18,2) DEFAULT 0,
        committed numeric(18,2) DEFAULT 0,
        actual numeric(18,2) DEFAULT 0,
        expected_landing numeric(18,2) DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (version_id, period)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        version_id uuid NOT NULL REFERENCES spend_versions(id) ON DELETE CASCADE,
        company_id uuid NOT NULL REFERENCES companies(id),
        department_id uuid NOT NULL REFERENCES departments(id),
        allocation_pct numeric(7,4) NOT NULL,
        driver_type text,
        driver_note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id uuid NOT NULL REFERENCES spend_items(id) ON DELETE CASCADE,
        due_date date,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        assignee_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name text NOT NULL,
        record_id uuid NULL,
        action text NOT NULL,
        before_json jsonb,
        after_json jsonb,
        user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_amounts_version_period ON spend_amounts(version_id, period)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_allocations_version ON spend_allocations(version_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_company_dept ON users(company_id, department_id)`);

    // Seeds: currencies
    await queryRunner.query(`INSERT INTO currencies(code, name) VALUES ('EUR','Euro') ON CONFLICT DO NOTHING`);
    await queryRunner.query(`INSERT INTO currencies(code, name) VALUES ('USD','US Dollar') ON CONFLICT DO NOTHING`);
    await queryRunner.query(`INSERT INTO currencies(code, name) VALUES ('GBP','British Pound') ON CONFLICT DO NOTHING`);

    // Seeds: spread_profiles (flat and 4-4-5)
    await queryRunner.query(`
      INSERT INTO spread_profiles(name, type, weights_json)
      VALUES (
        'flat', 'system', '[0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333,0.0833333333]'
      )
      ON CONFLICT (name) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO spread_profiles(name, type, weights_json)
      VALUES (
        '4-4-5', 'system', '[0.0769230769,0.0769230769,0.0961538462,0.0769230769,0.0769230769,0.0961538462,0.0769230769,0.0769230769,0.0961538462,0.0769230769,0.0769230769,0.0961538462]'
      )
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_tasks`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_allocations`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_amounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS spread_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS fx_rates`);
    await queryRunner.query(`DROP TABLE IF EXISTS currencies`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_classifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS suppliers`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments`);
    await queryRunner.query(`DROP TABLE IF EXISTS companies`);
    await queryRunner.query(`DROP TYPE IF EXISTS input_grain`);
    // keep extension installed
  }
}

