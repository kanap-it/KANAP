import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MilestoneStatus = 'pending' | 'achieved' | 'missed';

@Entity('portfolio_project_milestones')
@Index(['project_id'])
@Index(['phase_id'])
@Index(['tenant_id', 'project_id'])
export class PortfolioProjectMilestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid', { nullable: true })
  phase_id!: string | null;

  @Column('text')
  name!: string;

  @Column('date', { nullable: true })
  target_date!: Date | null;

  @Column('text', { default: 'pending' })
  status!: MilestoneStatus;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
