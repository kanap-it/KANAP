import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ActivityType = 'change' | 'comment' | 'decision';

export type DecisionOutcome = 'go' | 'no_go' | 'defer' | 'need_info' | 'analysis_complete';

@Entity('portfolio_activities')
@Index(['tenant_id', 'request_id'])
@Index(['tenant_id', 'project_id'])
@Index(['tenant_id', 'task_id'])
@Index(['tenant_id', 'created_at'])
export class PortfolioActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  request_id!: string | null;

  @Column('uuid', { nullable: true })
  project_id!: string | null;

  @Column('uuid', { nullable: true })
  task_id!: string | null;

  @Column('uuid', { nullable: true })
  author_id!: string | null;

  @Column('text', { nullable: true })
  context!: string | null;

  @Column('text')
  type!: ActivityType;

  @Column('text', { nullable: true })
  content!: string | null;

  @Column('text', { nullable: true })
  decision_outcome!: DecisionOutcome | null;

  @Column('jsonb', { nullable: true })
  changed_fields!: Record<string, [unknown, unknown]> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { nullable: true })
  updated_at!: Date | null;
}
