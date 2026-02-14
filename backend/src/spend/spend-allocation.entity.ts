import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('spend_allocations')
export class SpendAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  version_id!: string;

  @Column('uuid')
  company_id!: string;

  @Column('uuid', { nullable: true })
  department_id!: string | null;

  @Column('numeric', { precision: 7, scale: 4 })
  allocation_pct!: string | number; // percentage value, e.g., 25.0000

  // driver fields removed; allocation rows are explicit percentages only

  @Column('boolean', { default: false })
  is_system_generated!: boolean;

  @Column('uuid', { nullable: true })
  rule_id!: string | null;

  @Column('text', { nullable: true })
  materialized_from!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
