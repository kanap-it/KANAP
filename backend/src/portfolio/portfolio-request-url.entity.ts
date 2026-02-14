import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_urls')
@Index(['request_id'])
export class PortfolioRequestUrl {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('text')
  url!: string;

  @Column('text', { nullable: true })
  label!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
