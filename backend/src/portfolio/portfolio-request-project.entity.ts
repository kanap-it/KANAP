import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_projects')
@Index(['request_id', 'project_id'], { unique: true })
export class PortfolioRequestProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
