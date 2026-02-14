import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface PhaseTemplateItemData {
  id?: string;
  name: string;
  sequence: number;
  has_milestone: boolean;
  milestone_name: string | null;
}

export const DEFAULT_PHASE_TEMPLATES = [
  {
    name: 'Mini Project',
    items: [
      { name: 'Realization', has_milestone: true, milestone_name: 'Go-live' },
      { name: 'Documentation & Competence Transfer', has_milestone: true, milestone_name: 'Project Complete' },
    ],
  },
  {
    name: 'Business Apps',
    items: [
      { name: 'Requirement Analysis & Specifications', has_milestone: true, milestone_name: 'Specs Ready' },
      { name: 'Realization / Development / Unit Testing', has_milestone: true, milestone_name: 'Ready for UAT' },
      { name: 'User Acceptance Testing', has_milestone: true, milestone_name: 'Ready for Deployment' },
      { name: 'Go-live & Hypercare', has_milestone: true, milestone_name: 'Deployment Successful' },
      { name: 'Documentation & Competence Transfer', has_milestone: true, milestone_name: 'Project Complete' },
    ],
  },
  {
    name: 'IT Project',
    items: [
      { name: 'Requirements Analysis & Solution Selection', has_milestone: true, milestone_name: 'Ready for Implementation' },
      { name: 'Implementation', has_milestone: true, milestone_name: 'Ready for Production' },
      { name: 'Deployment & Hypercare', has_milestone: true, milestone_name: 'Deployment Successful' },
      { name: 'Documentation & Competence Transfer', has_milestone: true, milestone_name: 'Project Complete' },
    ],
  },
];

@Entity('portfolio_phase_templates')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'sequence'])
export class PortfolioPhaseTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('boolean', { default: false })
  is_system!: boolean;

  @Column('int', { default: 0 })
  sequence!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
