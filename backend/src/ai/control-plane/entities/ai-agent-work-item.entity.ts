import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_agent_work_items')
@Index(['tenant_id', 'agent_definition_id', 'status', 'priority', 'next_attempt_at'])
@Index(['tenant_id', 'source_provider_kind', 'source_provider_key', 'source_object_type', 'source_object_ref'])
@Index(['tenant_id', 'last_run_id'])
export class AiAgentWorkItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  agent_definition_id!: string;

  @Column('uuid', { nullable: true })
  trigger_id!: string | null;

  @Column('text')
  source_provider_kind!: string;

  @Column('text')
  source_provider_key!: string;

  @Column('text')
  source_object_type!: string;

  @Column('text')
  source_object_ref!: string;

  @Column('timestamptz', { nullable: true })
  source_object_updated_at!: Date | null;

  @Column('text')
  work_kind!: string;

  @Column('text')
  status!: string;

  @Column('int', { default: 100 })
  priority!: number;

  @Column('text')
  dedup_key!: string;

  @Column('text', { nullable: true })
  lease_owner!: string | null;

  @Column('timestamptz', { nullable: true })
  leased_until!: Date | null;

  @Column('int', { default: 0 })
  attempt_count!: number;

  @Column('int', { default: 3 })
  max_attempts!: number;

  @Column('timestamptz', { default: () => 'now()' })
  next_attempt_at!: Date;

  @Column('uuid', { nullable: true })
  last_run_id!: string | null;

  @Column('jsonb', { nullable: true })
  last_action_request_ids!: string[] | null;

  @Column('text', { nullable: true })
  last_error!: string | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
