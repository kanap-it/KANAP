import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_request_contacts')
@Index(['request_id', 'contact_id'], { unique: true })
export class PortfolioRequestContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid')
  contact_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
