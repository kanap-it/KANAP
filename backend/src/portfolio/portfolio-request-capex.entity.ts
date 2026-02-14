import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_capex')
@Index(['request_id', 'capex_id'], { unique: true })
export class PortfolioRequestCapex {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid')
  capex_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
