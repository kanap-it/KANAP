import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_run_steps')
@Index(['tenant_id', 'run_id', 'step_index'])
@Index(['tenant_id', 'status', 'created_at'])
export class AiRunStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  run_id!: string;

  @Column('int')
  step_index!: number;

  @Column('text')
  kind!: string;

  @Column('text')
  status!: string;

  @Column('text', { nullable: true })
  capability_name!: string | null;

  @Column('text', { nullable: true })
  capability_version!: string | null;

  @Column('jsonb', { nullable: true })
  input_summary!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  output_summary!: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  error_message!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  started_at!: Date;

  @Column('timestamptz', { nullable: true })
  completed_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
