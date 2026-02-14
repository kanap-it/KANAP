import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PhaseStatus = 'pending' | 'in_progress' | 'completed';

@Entity('portfolio_project_phases')
@Index(['project_id', 'sequence'])
@Index(['tenant_id', 'project_id'])
export class PortfolioProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('text')
  name!: string;

  @Column('int', { default: 0 })
  sequence!: number;

  @Column('date', { nullable: true })
  planned_start!: Date | null;

  @Column('date', { nullable: true })
  planned_end!: Date | null;

  @Column('text', { default: 'pending' })
  status!: PhaseStatus;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
