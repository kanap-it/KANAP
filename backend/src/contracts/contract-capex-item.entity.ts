import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('contract_capex_items')
export class ContractCapexItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  contract_id!: string;

  @Column('uuid')
  capex_item_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

