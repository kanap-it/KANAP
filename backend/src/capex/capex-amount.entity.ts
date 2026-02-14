import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('capex_amounts')
@Index(['version_id', 'period'], { unique: true })
export class CapexAmount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  version_id!: string;

  @Column('date')
  period!: string; // YYYY-MM-01

  @Column('numeric', { precision: 18, scale: 2, default: 0 })
  planned!: string | number;

  @Column('numeric', { precision: 18, scale: 2, default: 0 })
  forecast!: string | number;

  @Column('numeric', { precision: 18, scale: 2, default: 0 })
  committed!: string | number;

  @Column('numeric', { precision: 18, scale: 2, default: 0 })
  actual!: string | number;

  @Column('numeric', { precision: 18, scale: 2, default: 0 })
  expected_landing!: string | number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
