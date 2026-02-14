import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TimeEntryCategory = 'it' | 'business';

@Entity('portfolio_project_time_entries')
@Index(['project_id'])
@Index(['tenant_id', 'project_id'])
@Index(['logged_by_id'])
export class PortfolioProjectTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('text')
  category!: TimeEntryCategory;

  @Column('uuid', { nullable: true })
  user_id!: string | null;

  @Column('int')
  hours!: number;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('uuid', { nullable: true })
  logged_by_id!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  logged_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
