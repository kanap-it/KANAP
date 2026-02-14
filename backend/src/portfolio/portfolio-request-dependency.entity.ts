import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_dependencies')
@Index(['request_id', 'depends_on_request_id'])
@Index(['request_id', 'depends_on_project_id'])
export class PortfolioRequestDependency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid', { nullable: true })
  depends_on_request_id?: string;

  @Column('uuid', { nullable: true })
  depends_on_project_id?: string;

  @Column('text', { default: 'blocks' })
  dependency_type!: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
