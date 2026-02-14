import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_project_capex')
@Index(['project_id', 'capex_id'], { unique: true })
export class PortfolioProjectCapex {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid')
  capex_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
