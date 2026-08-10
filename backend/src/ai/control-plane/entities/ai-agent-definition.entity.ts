import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_agent_definitions')
@Index(['tenant_id', 'agent_key'], { unique: true })
@Index(['tenant_id', 'status', 'agent_type'])
@Index(['tenant_id', 'environment', 'status'])
export class AiAgentDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  agent_key!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  agent_type!: string;

  @Column('text')
  status!: string;

  @Column('text')
  environment!: string;

  @Column('jsonb', { nullable: true })
  provider_bindings_json!: Record<string, unknown> | null;

  // Registry model this agent runs on; null resolves to the tenant default
  // entry, then the platform builtin model.
  @Column('uuid', { nullable: true })
  llm_model_config_id!: string | null;

  @Column('jsonb', { nullable: true })
  allowed_capabilities_json!: Record<string, unknown> | unknown[] | null;

  @Column('jsonb', { nullable: true })
  forbidden_capabilities_json!: Record<string, unknown> | unknown[] | null;

  @Column('text')
  max_autonomy_level!: string;

  @Column('text')
  default_approval_requirement!: string;

  @Column('int', { default: 100 })
  agent_priority!: number;

  @Column('jsonb', { nullable: true })
  trigger_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  scope_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  queue_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  response_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  evaluation_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  persona_json!: Record<string, unknown> | null;

  @Column('int', { default: 1 })
  config_version!: number;

  @Column('uuid', { nullable: true })
  updated_by_user_id!: string | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
