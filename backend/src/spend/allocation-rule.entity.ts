import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from 'typeorm';

// Default allocation method per tenant per year
// Methods: headcount | it_users | turnover
@Entity('allocation_rules')
@Unique(['tenant_id', 'fiscal_year'])
export class AllocationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant placeholder; if you don't yet have tenants, keep a single row with a static id
  @Column('uuid', { nullable: true })
  @Index()
  tenant_id!: string | null;

  @Column('integer')
  fiscal_year!: number;

  @Column('text')
  method!: 'headcount' | 'it_users' | 'turnover';

  @Column('text', { default: 'active' })
  status!: 'active' | 'inactive';

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

