import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_tool_executions')
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'capability_name', 'capability_version', 'created_at'])
@Index(['tenant_id', 'status', 'created_at'])
@Index(['tenant_id', 'action_request_id'])
export class AiToolExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  run_id!: string;

  @Column('uuid', { nullable: true })
  step_id!: string | null;

  @Column('uuid', { nullable: true })
  action_request_id!: string | null;

  @Column('uuid', { nullable: true })
  approval_id!: string | null;

  @Column('text')
  capability_name!: string;

  @Column('text')
  capability_version!: string;

  @Column('text')
  surface!: string;

  @Column('text')
  effect!: string;

  @Column('text')
  status!: string;

  @Column('text', { nullable: true })
  input_hash!: string | null;

  @Column('jsonb', { nullable: true })
  input_summary!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  output_summary!: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  error_message!: string | null;

  @Column('int', { nullable: true })
  duration_ms!: number | null;

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
}
