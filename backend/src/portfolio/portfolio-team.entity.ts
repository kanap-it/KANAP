import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_teams')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'display_order'])
export class PortfolioTeam {
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

  @Column('uuid', { nullable: true })
  parent_id!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

// Default teams to seed
export const DEFAULT_TEAMS = [
  { name: 'Infrastructure', description: 'Network, servers, and cloud infrastructure', display_order: 0, is_system: true },
  { name: 'Business Applications', description: 'ERP, CRM, and business software systems', display_order: 1, is_system: true },
  { name: 'Engineering Applications', description: 'Custom development and engineering tools', display_order: 2, is_system: true },
  { name: 'Service Desk', description: 'End-user support and helpdesk', display_order: 3, is_system: true },
  { name: 'Master Data', description: 'Master data management and governance', display_order: 4, is_system: true },
  { name: 'Cybersecurity', description: 'Security operations and compliance', display_order: 5, is_system: true },
];
