import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_employment_types')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'display_order'])
export class PortfolioEmploymentType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('boolean', { default: false })
  is_system!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

// Seeded for every tenant (at creation, and by migration for existing ones).
// Renameable, never deletable: they are plain data, not translated. The first
// one is the default every new contributor starts on; "Other" is the catch-all,
// so a contributor is never without a contract type.
export const DEFAULT_EMPLOYMENT_TYPES = [
  { name: 'Internal', display_order: 0, is_system: true },
  { name: 'External', display_order: 1, is_system: true },
  { name: 'Apprentice', display_order: 2, is_system: true },
  { name: 'Other', display_order: 3, is_system: true },
];
