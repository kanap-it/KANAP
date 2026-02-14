import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_project_opex')
@Index(['project_id', 'opex_id'], { unique: true })
export class PortfolioProjectOpex {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid')
  opex_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
