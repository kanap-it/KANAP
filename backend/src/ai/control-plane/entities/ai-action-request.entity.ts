import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_action_requests')
@Index(['tenant_id', 'status', 'created_at'])
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'preview_id'], { unique: true, where: 'preview_id IS NOT NULL' })
@Index(['tenant_id', 'capability_name', 'capability_version', 'created_at'])
@Index(['tenant_id', 'capability_name', 'capability_version', 'idempotency_key'], { unique: true, where: 'idempotency_key IS NOT NULL' })
export class AiActionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  run_id!: string | null;

  @Column('uuid', { nullable: true })
  tool_execution_id!: string | null;

  @Column('uuid', { nullable: true })
  conversation_id!: string | null;

  @Column('uuid', { nullable: true })
  user_id!: string | null;

  @Column('uuid', { nullable: true })
  preview_id!: string | null;

  @Column('text')
  capability_name!: string;

  @Column('text')
  capability_version!: string;

  @Column('text')
  effect!: string;

  @Column('text')
  status!: string;

  @Column('text', { nullable: true })
  target_type!: string | null;

  @Column('uuid', { nullable: true })
  target_id!: string | null;

  @Column('text', { nullable: true })
  target_ref!: string | null;

  @Column('text', { nullable: true })
  idempotency_key!: string | null;

  @Column('jsonb', { nullable: true })
  action_payload_json!: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  provider_kind!: string | null;

  @Column('text', { nullable: true })
  provider_key!: string | null;

  @Column('text')
  input_hash!: string;

  @Column('jsonb', { nullable: true })
  input_summary!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  evidence_ids!: string[] | null;

  @Column('timestamptz', { nullable: true })
  expires_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  approved_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  rejected_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  executed_at!: Date | null;

  @Column('text', { nullable: true })
  error_message!: string | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
