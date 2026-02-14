import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_phase_template_items')
@Index(['template_id', 'sequence'])
export class PortfolioPhaseTemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  template_id!: string;

  @Column('text')
  name!: string;

  @Column('int', { default: 0 })
  sequence!: number;

  @Column('boolean', { default: true })
  has_milestone!: boolean;

  @Column('text', { nullable: true })
  milestone_name!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
