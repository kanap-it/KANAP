import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_time_monthly_aggregates')
@Index(['tenant_id', 'user_id', 'year_month'], { unique: true })
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'year_month'])
export class UserTimeMonthlyAggregate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('date')
  year_month!: Date;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  project_hours!: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  other_hours!: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  total_hours!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
