import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_runs')
@Index(['tenant_id', 'status', 'created_at'])
@Index(['tenant_id', 'conversation_id', 'created_at'])
@Index(['tenant_id', 'invocation_channel', 'created_at'])
export class AiRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  user_id!: string | null;

  @Column('uuid', { nullable: true })
  conversation_id!: string | null;

  @Column('text', { nullable: true })
  request_id!: string | null;

  @Column('uuid', { nullable: true })
  ai_api_key_id!: string | null;

  @Column('text')
  invocation_channel!: string;

  @Column('text')
  trigger_kind!: string;

  @Column('text')
  status!: string;

  @Column('jsonb', { nullable: true })
  input_summary!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  output_summary!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  usage_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  cost_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  started_at!: Date;

  @Column('timestamptz', { nullable: true })
  completed_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
