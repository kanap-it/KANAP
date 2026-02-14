import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EffortType = 'it' | 'business';

@Entity('portfolio_project_effort_allocations')
@Index(['tenant_id', 'project_id'])
export class PortfolioProjectEffortAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  effort_type!: EffortType;

  @Column('integer')
  allocation_pct!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
