import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Attachments uploaded by users alongside Plaid chat messages (currently images only).
 *
 * Lifecycle:
 *   1. Frontend uploads via POST /ai/conversations/:id/attachments → row created with
 *      message_id = NULL (the message hasn't been sent yet).
 *   2. When the user sends the chat message, the orchestrator links the attachment(s)
 *      to the persisted ai_message via message_id, then includes them as multimodal
 *      content blocks in the LLM call.
 *
 * Tenant isolation is enforced at three layers: tenant_id default, FK on tenant-scoped
 * conversation_id, and an RLS policy mirroring app_current_tenant().
 */
@Entity('ai_message_attachments')
@Index(['tenant_id', 'conversation_id'])
@Index(['tenant_id', 'message_id'])
export class AiMessageAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  conversation_id!: string;

  @Column('uuid', { nullable: true })
  message_id!: string | null;

  @Column('uuid', { nullable: true })
  uploaded_by_id!: string | null;

  @Column('text')
  original_filename!: string;

  @Column('text')
  stored_filename!: string;

  @Column('text')
  mime_type!: string;

  @Column('int', { default: 0 })
  size!: number;

  @Column('text')
  storage_path!: string;

  /** Reserved for future kinds (pdf, doc) — currently always 'image'. */
  @Column('varchar', { length: 32, default: 'image' })
  kind!: string;

  @Column('timestamptz', { default: () => 'now()' })
  uploaded_at!: Date;

  @Column('timestamptz', { nullable: true })
  linked_at!: Date | null;
}
