import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_skills')
@Index(['tenant_id', 'category', 'name'])
@Index(['tenant_id', 'display_order'])
export class PortfolioSkill {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  category!: string;

  @Column('text')
  name!: string;

  @Column('boolean', { default: true })
  enabled!: boolean;

  @Column('int', { default: 0 })
  display_order!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

// Default skills to seed
export const DEFAULT_SKILLS = [
  // Infrastructure & Operations
  { category: 'Infrastructure & Operations', name: 'Network Administration' },
  { category: 'Infrastructure & Operations', name: 'Server Administration (Windows)' },
  { category: 'Infrastructure & Operations', name: 'Server Administration (Linux)' },
  { category: 'Infrastructure & Operations', name: 'Cloud Infrastructure (AWS/Azure/GCP)' },
  { category: 'Infrastructure & Operations', name: 'Virtualization' },
  { category: 'Infrastructure & Operations', name: 'Storage & Backup' },
  { category: 'Infrastructure & Operations', name: 'Database Administration' },
  { category: 'Infrastructure & Operations', name: 'Monitoring & Observability' },

  // Development & Engineering
  { category: 'Development & Engineering', name: 'Frontend Development' },
  { category: 'Development & Engineering', name: 'Backend Development' },
  { category: 'Development & Engineering', name: 'Full-Stack Development' },
  { category: 'Development & Engineering', name: 'Mobile Development' },
  { category: 'Development & Engineering', name: 'API Design & Integration' },
  { category: 'Development & Engineering', name: 'DevOps / CI-CD' },
  { category: 'Development & Engineering', name: 'Software Architecture' },
  { category: 'Development & Engineering', name: 'QA / Testing' },
  { category: 'Development & Engineering', name: 'Data Engineering' },

  // SAP
  { category: 'SAP', name: 'SAP FI (Financial Accounting)' },
  { category: 'SAP', name: 'SAP CO (Controlling)' },
  { category: 'SAP', name: 'SAP MM (Materials Management)' },
  { category: 'SAP', name: 'SAP SD (Sales & Distribution)' },
  { category: 'SAP', name: 'SAP PP (Production Planning)' },
  { category: 'SAP', name: 'SAP HR/HCM (Human Capital Management)' },
  { category: 'SAP', name: 'SAP PM (Plant Maintenance)' },
  { category: 'SAP', name: 'SAP QM (Quality Management)' },
  { category: 'SAP', name: 'SAP WM (Warehouse Management)' },
  { category: 'SAP', name: 'SAP PS (Project System)' },
  { category: 'SAP', name: 'SAP BW/BI (Business Warehouse)' },
  { category: 'SAP', name: 'SAP ABAP (Development)' },
  { category: 'SAP', name: 'SAP Basis (Administration)' },
  { category: 'SAP', name: 'SAP S/4HANA' },
  { category: 'SAP', name: 'SAP Fiori' },

  // Business Applications
  { category: 'Business Applications', name: 'ERP Administration' },
  { category: 'Business Applications', name: 'CRM Administration' },
  { category: 'Business Applications', name: 'Business Intelligence / Reporting' },
  { category: 'Business Applications', name: 'Office 365 / SharePoint' },
  { category: 'Business Applications', name: 'Workflow Automation' },
  { category: 'Business Applications', name: 'Integration / Middleware' },

  // End User Support
  { category: 'End User Support', name: 'Helpdesk / Service Desk' },
  { category: 'End User Support', name: 'Desktop Support' },
  { category: 'End User Support', name: 'Hardware Support' },
  { category: 'End User Support', name: 'User Training' },
  { category: 'End User Support', name: 'Documentation' },

  // Security & Compliance
  { category: 'Security & Compliance', name: 'Cybersecurity' },
  { category: 'Security & Compliance', name: 'Security Operations' },
  { category: 'Security & Compliance', name: 'Compliance / Audit' },
  { category: 'Security & Compliance', name: 'Risk Management' },

  // Project & Management
  { category: 'Project & Management', name: 'Project Management' },
  { category: 'Project & Management', name: 'Agile / Scrum' },
  { category: 'Project & Management', name: 'Business Analysis' },
  { category: 'Project & Management', name: 'Change Management' },
  { category: 'Project & Management', name: 'Vendor Management' },
  { category: 'Project & Management', name: 'ITIL / Service Management' },

  // Data & Analytics
  { category: 'Data & Analytics', name: 'Data Science' },
  { category: 'Data & Analytics', name: 'Machine Learning / AI' },
  { category: 'Data & Analytics', name: 'Data Analysis' },
  { category: 'Data & Analytics', name: 'Data Governance' },

  // Languages
  { category: 'Languages', name: 'English' },
  { category: 'Languages', name: 'French' },
  { category: 'Languages', name: 'German' },
  { category: 'Languages', name: 'Spanish' },
  { category: 'Languages', name: 'Italian' },
  { category: 'Languages', name: 'Dutch' },
  { category: 'Languages', name: 'Portuguese' },
  { category: 'Languages', name: 'Mandarin' },
];
