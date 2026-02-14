import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from 'typeorm';

@Entity('department_metrics')
@Unique(['department_id', 'fiscal_year'])
export class DepartmentMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  @Index()
  department_id!: string;

  @Column('integer')
  fiscal_year!: number;

  @Column('int')
  headcount!: number; // required per year

  @Column('boolean', { default: false })
  is_frozen!: boolean;

  @Column('timestamptz', { nullable: true })
  frozen_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
