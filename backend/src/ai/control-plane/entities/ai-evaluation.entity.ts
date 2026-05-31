import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_evaluations')
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'recommendation_id', 'created_at'])
@Index(['tenant_id', 'status', 'created_at'])
export class AiEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  run_id!: string | null;

  @Column('uuid', { nullable: true })
  recommendation_id!: string | null;

  @Column('uuid', { nullable: true })
  decision_id!: string | null;

  @Column('text')
  status!: string;

  @Column('text', { nullable: true })
  outcome!: string | null;

  @Column('jsonb', { nullable: true })
  scores_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  feedback_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
