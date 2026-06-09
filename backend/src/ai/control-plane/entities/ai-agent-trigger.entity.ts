import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_agent_triggers')
@Index(['tenant_id', 'agent_definition_id', 'trigger_key'], { unique: true })
@Index(['tenant_id', 'trigger_kind', 'enabled'])
export class AiAgentTrigger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  agent_definition_id!: string;

  @Column('text')
  trigger_key!: string;

  @Column('text')
  trigger_kind!: string;

  @Column('text')
  status!: string;

  @Column('boolean', { default: false })
  enabled!: boolean;

  @Column('jsonb', { nullable: true })
  trigger_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  scope_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
