import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_project_contacts')
@Index(['project_id', 'contact_id'], { unique: true })
export class PortfolioProjectContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid')
  contact_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
