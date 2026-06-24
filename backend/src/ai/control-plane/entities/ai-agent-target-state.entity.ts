import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_agent_target_states')
@Index(['tenant_id', 'agent_definition_id', 'provider_kind', 'provider_key', 'target_type', 'target_ref'], { unique: true })
@Index(['tenant_id', 'needs_followup', 'updated_at'])
@Index(['tenant_id', 'last_run_id'])
@Index(['tenant_id', 'agent_definition_id', 'next_review_at'])
@Index(['tenant_id', 'claim_status', 'claim_expires_at'])
@Index(['tenant_id', 'provider_kind', 'provider_key', 'target_type', 'target_ref'], { unique: true, where: "claim_status = 'claimed'" })
export class AiAgentTargetState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  agent_definition_id!: string;

  @Column('text')
  provider_kind!: string;

  @Column('text')
  provider_key!: string;

  @Column('text')
  target_type!: string;

  @Column('text')
  target_ref!: string;

  @Column('timestamptz', { nullable: true })
  last_seen_external_updated_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  last_processed_external_updated_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  next_review_at!: Date | null;

  @Column('uuid', { nullable: true })
  last_run_id!: string | null;

  @Column('text', { nullable: true })
  last_public_reply_hash!: string | null;

  @Column('text', { nullable: true })
  last_internal_note_hash!: string | null;

  @Column('text', { nullable: true })
  last_classification_hash!: string | null;

  @Column('text', { nullable: true })
  last_assignment_hash!: string | null;

  @Column('boolean', { default: false })
  agent_touched!: boolean;

  @Column('boolean', { default: false })
  needs_followup!: boolean;

  @Column('text', { default: 'none' })
  claim_status!: string;

  @Column('timestamptz', { nullable: true })
  claim_expires_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  claim_acquired_at!: Date | null;

  @Column('uuid', { nullable: true })
  claim_owner_work_item_id!: string | null;

  @Column('uuid', { nullable: true })
  claim_owner_run_id!: string | null;

  @Column('int', { nullable: true })
  claim_owner_priority!: number | null;

  @Column('jsonb', { nullable: true })
  claim_owner_action_request_ids!: string[] | null;

  @Column('jsonb', { nullable: true })
  claim_metadata_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  state_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
