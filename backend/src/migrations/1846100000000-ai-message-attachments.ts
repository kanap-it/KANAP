import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiMessageAttachments1846100000000 implements MigrationInterface {
  name = 'AiMessageAttachments1846100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ai_message_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        conversation_id uuid NOT NULL,
        message_id uuid,
        uploaded_by_id uuid,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NOT NULL,
        size integer NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        kind varchar(32) NOT NULL DEFAULT 'image',
        uploaded_at timestamptz NOT NULL DEFAULT now(),
        linked_at timestamptz,
        CONSTRAINT fk_ai_message_attachments_tenant
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_ai_message_attachments_conversation
          FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_ai_message_attachments_message
          FOREIGN KEY (message_id) REFERENCES ai_messages(id) ON DELETE SET NULL,
        CONSTRAINT fk_ai_message_attachments_uploader
          FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_ai_message_attachments_tenant_conv ON ai_message_attachments (tenant_id, conversation_id)`);
    await queryRunner.query(`CREATE INDEX idx_ai_message_attachments_tenant_message ON ai_message_attachments (tenant_id, message_id)`);
    await queryRunner.query(`CREATE INDEX idx_ai_message_attachments_unlinked ON ai_message_attachments (tenant_id, uploaded_at) WHERE message_id IS NULL`);

    await queryRunner.query(`ALTER TABLE ai_message_attachments ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_message_attachments FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY ai_message_attachments_tenant_isolation ON ai_message_attachments
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ai_message_attachments_tenant_isolation ON ai_message_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_message_attachments`);
  }
}
