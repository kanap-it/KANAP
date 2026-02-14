import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_categories')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'display_order'])
export class PortfolioCategory {
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

// Default categories (Security & Compliance removed - now a Type)
export const DEFAULT_CATEGORIES = [
  { name: 'Business Applications', description: 'ERP, CRM, and business software systems', display_order: 0, is_system: true },
  { name: 'End-user Computing & Services', description: 'Workplace, devices, and end-user support', display_order: 1, is_system: true },
  { name: 'Infrastructure & Operations', description: 'Network, servers, cloud, and data center', display_order: 2, is_system: true },
  { name: 'Innovation & Digital Transformation', description: 'New technologies, analytics, and digital initiatives', display_order: 3, is_system: true },
];
