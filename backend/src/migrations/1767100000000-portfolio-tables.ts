import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioTables1767100000000 implements MigrationInterface {
  name = 'PortfolioTables1767100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Portfolio Settings (tenant-level config)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        mandatory_bypass_enabled boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id)
      )
    `);

    // Evaluation Criteria
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_criteria (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        description text,
        weight numeric(5,2) NOT NULL DEFAULT 1.00,
        is_mandatory boolean NOT NULL DEFAULT false,
        sort_order int NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_criteria_tenant ON portfolio_criteria(tenant_id)`);

    // Criterion Values (scale options)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_criterion_values (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        criterion_id uuid NOT NULL REFERENCES portfolio_criteria(id) ON DELETE CASCADE,
        label text NOT NULL,
        numeric_value numeric(5,2) NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_criterion_values_criterion ON portfolio_criterion_values(criterion_id)`);

    // Portfolio Requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        purpose text,
        requestor_id uuid,
        type text NOT NULL DEFAULT 'business',
        category text,
        company_id uuid,
        department_id uuid,
        target_delivery_date date,
        status text NOT NULL DEFAULT 'pending_review',
        priority_score numeric(5,2),
        priority_override boolean NOT NULL DEFAULT false,
        override_justification text,
        override_value numeric(5,2),
        criteria_values jsonb NOT NULL DEFAULT '{}',
        estimated_effort_it_low numeric(10,2),
        estimated_effort_it_high numeric(10,2),
        estimated_effort_business_low numeric(10,2),
        estimated_effort_business_high numeric(10,2),
        current_situation text,
        expected_benefits text,
        risks text,
        business_sponsor_id uuid,
        business_lead_id uuid,
        it_sponsor_id uuid,
        it_lead_id uuid,
        created_by_id uuid,
        converted_date timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_requests_tenant_name ON portfolio_requests(tenant_id, name)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_requests_tenant_status ON portfolio_requests(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_requests_tenant_company ON portfolio_requests(tenant_id, company_id)`);

    // Portfolio Projects
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        description text,
        type text NOT NULL DEFAULT 'business',
        category text,
        company_id uuid,
        department_id uuid,
        status text NOT NULL DEFAULT 'initiation',
        priority_score numeric(5,2),
        priority_override boolean NOT NULL DEFAULT false,
        override_justification text,
        override_value numeric(5,2),
        criteria_values jsonb NOT NULL DEFAULT '{}',
        planned_start date,
        planned_end date,
        actual_start date,
        actual_end date,
        baseline_start date,
        baseline_end date,
        estimated_effort_it numeric(10,2),
        estimated_effort_business numeric(10,2),
        baseline_effort_it numeric(10,2),
        baseline_effort_business numeric(10,2),
        business_sponsor_id uuid,
        business_lead_id uuid,
        it_sponsor_id uuid,
        it_lead_id uuid,
        created_by_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_projects_tenant_name ON portfolio_projects(tenant_id, name)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_projects_tenant_status ON portfolio_projects(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_projects_tenant_company ON portfolio_projects(tenant_id, company_id)`);

    // Portfolio Activities (shared for requests and projects)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_activities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid,
        project_id uuid,
        author_id uuid,
        context text,
        type text NOT NULL,
        content text,
        decision_outcome text,
        changed_fields jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_activities_tenant_request ON portfolio_activities(tenant_id, request_id)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_activities_tenant_project ON portfolio_activities(tenant_id, project_id)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_activities_tenant_created ON portfolio_activities(tenant_id, created_at)`);

    // Team Member Config (for capacity planning)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_team_member_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        available_hours_per_week numeric(5,2) NOT NULL DEFAULT 40.00,
        effective_from date NOT NULL,
        effective_to date,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_team_member_configs_tenant_user ON portfolio_team_member_configs(tenant_id, user_id)`);

    // Request Junction Tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_team (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        role text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, user_id, role)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, contact_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_dependencies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        depends_on_request_id uuid REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        depends_on_project_id uuid REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        dependency_type text NOT NULL DEFAULT 'blocks',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_urls (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        url text NOT NULL,
        label text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_request_urls_request ON portfolio_request_urls(request_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text,
        size int NOT NULL,
        storage_path text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_request_attachments_request ON portfolio_request_attachments(request_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, project_id)
      )
    `);

    // Project Junction Tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_team (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        role text NOT NULL,
        allocation_percent numeric(5,2),
        start_date date,
        end_date date,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, user_id, role)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, contact_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_dependencies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        depends_on_project_id uuid REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        dependency_type text NOT NULL DEFAULT 'blocks',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_urls (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        url text NOT NULL,
        label text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_project_urls_project ON portfolio_project_urls(project_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text,
        size int NOT NULL,
        storage_path text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_project_attachments_project ON portfolio_project_attachments(project_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_capex (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        capex_item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, capex_item_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_opex (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        spend_item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, spend_item_id)
      )
    `);

    // Enable RLS on all portfolio tables
    const tables = [
      'portfolio_settings',
      'portfolio_criteria',
      'portfolio_criterion_values',
      'portfolio_requests',
      'portfolio_projects',
      'portfolio_activities',
      'portfolio_team_member_configs',
      'portfolio_request_team',
      'portfolio_request_contacts',
      'portfolio_request_dependencies',
      'portfolio_request_urls',
      'portfolio_request_attachments',
      'portfolio_request_projects',
      'portfolio_project_team',
      'portfolio_project_contacts',
      'portfolio_project_dependencies',
      'portfolio_project_urls',
      'portfolio_project_attachments',
      'portfolio_project_capex',
      'portfolio_project_opex',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = app_current_tenant()::uuid)
        WITH CHECK (tenant_id = app_current_tenant()::uuid)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'portfolio_project_opex',
      'portfolio_project_capex',
      'portfolio_project_attachments',
      'portfolio_project_urls',
      'portfolio_project_dependencies',
      'portfolio_project_contacts',
      'portfolio_project_team',
      'portfolio_request_projects',
      'portfolio_request_attachments',
      'portfolio_request_urls',
      'portfolio_request_dependencies',
      'portfolio_request_contacts',
      'portfolio_request_team',
      'portfolio_team_member_configs',
      'portfolio_activities',
      'portfolio_projects',
      'portfolio_requests',
      'portfolio_criterion_values',
      'portfolio_criteria',
      'portfolio_settings',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }
}
