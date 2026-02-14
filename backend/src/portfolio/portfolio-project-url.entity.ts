import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_project_urls')
@Index(['project_id'])
export class PortfolioProjectUrl {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('text')
  url!: string;

  @Column('text', { nullable: true })
  label!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
