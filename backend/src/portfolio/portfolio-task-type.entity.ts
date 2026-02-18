import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_task_types')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'display_order'])
export class PortfolioTaskType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

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

// Default task types to seed
// All defaults are editable/removable preload values for new tenants
export const DEFAULT_TASK_TYPES = [
  { name: 'Task', description: 'Standard task or work item', display_order: 0, is_system: false },
  { name: 'Bug', description: 'Software defect or error', display_order: 1, is_system: false },
  { name: 'Problem', description: 'Operational issue requiring investigation', display_order: 2, is_system: false },
  { name: 'Incident', description: 'Service disruption or security event', display_order: 3, is_system: false },
];
