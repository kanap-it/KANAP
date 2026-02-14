import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('contract_spend_items')
@Index(['contract_id', 'spend_item_id'], { unique: true })
export class ContractSpendItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  contract_id!: string;

  @Column('uuid')
  spend_item_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
