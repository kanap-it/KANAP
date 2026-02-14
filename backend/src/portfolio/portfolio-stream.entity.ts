import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_streams')
@Index(['tenant_id', 'category_id', 'name'], { unique: true })
@Index(['tenant_id', 'category_id', 'display_order'])
export class PortfolioStream {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  category_id!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

// Default streams per category (category_name used for lookup during seeding)
export const DEFAULT_STREAMS = [
  // Business Applications
  { category_name: 'Business Applications', name: 'SAP Sales & Distribution', display_order: 0 },
  { category_name: 'Business Applications', name: 'SAP Finance & Controlling', display_order: 1 },
  { category_name: 'Business Applications', name: 'SAP Production Planning', display_order: 2 },
  { category_name: 'Business Applications', name: 'SAP HR / HCM', display_order: 3 },
  { category_name: 'Business Applications', name: 'CRM / Dynamics', display_order: 4 },
  { category_name: 'Business Applications', name: 'ERP (Other)', display_order: 5 },
  { category_name: 'Business Applications', name: 'Reporting & BI', display_order: 6 },
  { category_name: 'Business Applications', name: 'Interfaces & Integration', display_order: 7 },

  // End-user Computing & Services
  { category_name: 'End-user Computing & Services', name: 'Workplace & Collaboration', display_order: 0 },
  { category_name: 'End-user Computing & Services', name: 'Mobile Devices & MDM', display_order: 1 },
  { category_name: 'End-user Computing & Services', name: 'Printing & Peripherals', display_order: 2 },
  { category_name: 'End-user Computing & Services', name: 'Service Desk', display_order: 3 },

  // Infrastructure & Operations
  { category_name: 'Infrastructure & Operations', name: 'Network & Security', display_order: 0 },
  { category_name: 'Infrastructure & Operations', name: 'Virtual Infrastructure', display_order: 1 },
  { category_name: 'Infrastructure & Operations', name: 'Cloud (AWS/Azure/GCP)', display_order: 2 },
  { category_name: 'Infrastructure & Operations', name: 'Storage & Backup', display_order: 3 },
  { category_name: 'Infrastructure & Operations', name: 'Databases', display_order: 4 },
  { category_name: 'Infrastructure & Operations', name: 'Interfaces & Integration', display_order: 5 },

  // Innovation & Digital Transformation
  { category_name: 'Innovation & Digital Transformation', name: 'Data & Analytics', display_order: 0 },
  { category_name: 'Innovation & Digital Transformation', name: 'AI & Automation', display_order: 1 },
  { category_name: 'Innovation & Digital Transformation', name: 'Web & Mobile Development', display_order: 2 },
  { category_name: 'Innovation & Digital Transformation', name: 'IoT & Edge', display_order: 3 },
];
