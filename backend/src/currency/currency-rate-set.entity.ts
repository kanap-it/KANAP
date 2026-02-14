import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('currency_rate_sets')
export class CurrencyRateSet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('integer')
  fiscal_year!: number;

  @Column('char', { length: 3 })
  base_currency!: string;

  @Column('jsonb')
  rates!: Record<string, number | null>;

  @Column('text', { default: 'annual_avg' })
  rate_basis!: string;

  @Column('text', { default: 'world-bank' })
  source!: string;

  @Column('timestamptz', { default: () => 'now()' })
  captured_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
