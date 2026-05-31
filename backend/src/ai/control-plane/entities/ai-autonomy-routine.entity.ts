import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_autonomy_routines')
@Index(['tenant_id', 'routine_key'], { unique: true })
@Index(['tenant_id', 'trigger_kind', 'enabled'])
@Index(['tenant_id', 'workflow_type', 'enabled'])
export class AiAutonomyRoutine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  routine_key!: string;

  @Column('text')
  name!: string;

  @Column('text')
  trigger_kind!: string;

  @Column('text')
  workflow_type!: string;

  @Column('boolean')
  enabled!: boolean;

  @Column('text')
  provider_key!: string;

  @Column('jsonb', { nullable: true })
  schedule_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  alert_filter_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  input_json!: Record<string, unknown> | null;

  @Column('int')
  max_runs_per_window!: number;

  @Column('int')
  cooldown_seconds!: number;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { nullable: true })
  last_triggered_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
