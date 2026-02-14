import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_criteria')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'display_order'])
export class PortfolioCriterion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  name!: string;

  // System key for identifying built-in criteria (e.g., 'time_estimation_it', 'time_estimation_business')
  // Null for user-created criteria. Cannot be changed once set.
  @Column('text', { nullable: true })
  system_key!: string | null;

  @Column('boolean', { default: true })
  enabled!: boolean;

  @Column('boolean', { default: false })
  inverted!: boolean;

  @Column('numeric', { precision: 5, scale: 2, default: 1 })
  weight!: number;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
