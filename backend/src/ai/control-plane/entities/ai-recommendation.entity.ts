import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_recommendations')
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'observation_id', 'created_at'])
@Index(['tenant_id', 'status', 'created_at'])
export class AiRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  run_id!: string | null;

  @Column('uuid', { nullable: true })
  observation_id!: string | null;

  @Column('text')
  recommendation_type!: string;

  @Column('text')
  status!: string;

  @Column('text')
  summary!: string;

  @Column('text', { nullable: true })
  rationale!: string | null;

  @Column('double precision', { nullable: true })
  confidence!: number | null;

  @Column('text', { nullable: true })
  proposed_action_class!: string | null;

  @Column('text')
  max_autonomy_level!: string;

  @Column('jsonb', { nullable: true })
  evidence_ids!: string[] | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
