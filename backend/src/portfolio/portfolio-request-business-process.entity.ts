import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_business_processes')
@Index(['request_id', 'business_process_id'], { unique: true })
export class PortfolioRequestBusinessProcess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid')
  business_process_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
