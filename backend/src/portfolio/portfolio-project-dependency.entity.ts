import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_project_dependencies')
@Index(['project_id', 'depends_on_project_id'])
export class PortfolioProjectDependency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid', { nullable: true })
  depends_on_project_id?: string;

  @Column('text', { default: 'blocks' })
  dependency_type!: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
