import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_decisions')
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'recommendation_id', 'created_at'])
@Index(['tenant_id', 'decision', 'created_at'])
export class AiDecision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  run_id!: string | null;

  @Column('uuid', { nullable: true })
  recommendation_id!: string | null;

  @Column('text')
  decision!: string;

  @Column('text')
  status!: string;

  @Column('text')
  reason!: string;

  @Column('jsonb', { nullable: true })
  evidence_ids!: string[] | null;

  @Column('jsonb', { nullable: true })
  policy_result_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
