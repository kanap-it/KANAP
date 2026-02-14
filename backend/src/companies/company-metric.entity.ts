import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from 'typeorm';

@Entity('company_metrics')
@Unique(['company_id', 'fiscal_year'])
export class CompanyMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  @Index()
  company_id!: string;

  @Column('integer')
  fiscal_year!: number; // calendar year

  @Column('int')
  headcount!: number; // required per year

  @Column('int', { nullable: true })
  it_users!: number | null;

  @Column('numeric', { precision: 18, scale: 3, nullable: true })
  turnover!: string | number | null;

  @Column('boolean', { default: false })
  is_frozen!: boolean;

  @Column('timestamptz', { nullable: true })
  frozen_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
