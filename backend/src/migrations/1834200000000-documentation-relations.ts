import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentationRelations1834200000000 implements MigrationInterface {
  name = 'DocumentationRelations1834200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_contributors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role text NOT NULL,
        is_primary boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_document_contributors_role
          CHECK (role IN ('owner', 'author', 'reviewer', 'validator')),
        CONSTRAINT fk_document_contributors_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_contributors_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_document_contributors_tenant_document ON document_contributors (tenant_id, document_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_contributors_document_user_role ON document_contributors (document_id, user_id, role)`);

    await queryRunner.query(`
      CREATE TABLE document_classifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        category_id uuid NOT NULL,
        stream_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_classifications_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_classifications_category
          FOREIGN KEY (category_id) REFERENCES portfolio_categories(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_classifications_stream
          FOREIGN KEY (stream_id) REFERENCES portfolio_streams(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_document_classifications_tenant_document ON document_classifications (tenant_id, document_id)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_classifications_pair
      ON document_classifications (
        document_id,
        category_id,
        coalesce(stream_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE document_references (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        source_document_id uuid NOT NULL,
        target_document_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_document_references_not_self CHECK (source_document_id <> target_document_id),
        CONSTRAINT fk_document_references_source
          FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_references_target
          FOREIGN KEY (target_document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_references_source_target ON document_references (source_document_id, target_document_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_references_tenant_target ON document_references (tenant_id, target_document_id)`);

    await queryRunner.query(`
      CREATE TABLE document_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        application_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_applications_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_applications_application
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_applications_pair ON document_applications (document_id, application_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_applications_tenant_application ON document_applications (tenant_id, application_id)`);

    await queryRunner.query(`
      CREATE TABLE document_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        asset_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_assets_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_assets_asset
          FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_assets_pair ON document_assets (document_id, asset_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_assets_tenant_asset ON document_assets (tenant_id, asset_id)`);

    await queryRunner.query(`
      CREATE TABLE document_projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        project_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_projects_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_projects_project
          FOREIGN KEY (project_id) REFERENCES portfolio_projects(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_projects_pair ON document_projects (document_id, project_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_projects_tenant_project ON document_projects (tenant_id, project_id)`);

    await queryRunner.query(`
      CREATE TABLE document_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        request_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_requests_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_requests_request
          FOREIGN KEY (request_id) REFERENCES portfolio_requests(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_requests_pair ON document_requests (document_id, request_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_requests_tenant_request ON document_requests (tenant_id, request_id)`);

    await queryRunner.query(`
      CREATE TABLE document_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        task_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_tasks_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_tasks_task
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_tasks_pair ON document_tasks (document_id, task_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_tasks_tenant_task ON document_tasks (tenant_id, task_id)`);

    const tables = [
      'document_contributors',
      'document_classifications',
      'document_references',
      'document_applications',
      'document_assets',
      'document_projects',
      'document_requests',
      'document_tasks',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
          USING (tenant_id = app_current_tenant())
          WITH CHECK (tenant_id = app_current_tenant())
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'document_tasks',
      'document_requests',
      'document_projects',
      'document_assets',
      'document_applications',
      'document_references',
      'document_classifications',
      'document_contributors',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
