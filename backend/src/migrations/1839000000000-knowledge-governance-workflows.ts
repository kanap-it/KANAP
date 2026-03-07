import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeGovernanceWorkflows1839000000000 implements MigrationInterface {
  name = 'KnowledgeGovernanceWorkflows1839000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_workflows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        status text NOT NULL,
        requested_revision int NOT NULL,
        requested_by uuid NULL,
        requested_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL,
        CONSTRAINT chk_document_workflows_status
          CHECK (status IN ('pending_review', 'pending_approval', 'changes_requested', 'approved', 'cancelled')),
        CONSTRAINT fk_document_workflows_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_workflows_requested_by
          FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_document_workflows_tenant_document ON document_workflows (tenant_id, document_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_workflows_tenant_status ON document_workflows (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_document_workflows_tenant_requested_at ON document_workflows (tenant_id, requested_at DESC)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_workflows_active_per_document
      ON document_workflows (document_id)
      WHERE status IN ('pending_review', 'pending_approval')
    `);

    await queryRunner.query(`
      CREATE TABLE document_workflow_participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        workflow_id uuid NOT NULL,
        user_id uuid NOT NULL,
        stage text NOT NULL,
        decision text NOT NULL DEFAULT 'pending',
        comment text NULL,
        acted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_document_workflow_participants_stage
          CHECK (stage IN ('reviewer', 'approver')),
        CONSTRAINT chk_document_workflow_participants_decision
          CHECK (decision IN ('pending', 'approved', 'changes_requested')),
        CONSTRAINT fk_document_workflow_participants_workflow
          FOREIGN KEY (workflow_id) REFERENCES document_workflows(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_workflow_participants_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_document_workflow_participants_tenant_workflow
      ON document_workflow_participants (tenant_id, workflow_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_workflow_participants_workflow_user_stage
      ON document_workflow_participants (workflow_id, user_id, stage)
    `);

    const tables = [
      'document_workflows',
      'document_workflow_participants',
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
      'document_workflow_participants',
      'document_workflows',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
