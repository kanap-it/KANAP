import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_opex')
@Index(['request_id', 'opex_id'], { unique: true })
export class PortfolioRequestOpex {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid')
  opex_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
