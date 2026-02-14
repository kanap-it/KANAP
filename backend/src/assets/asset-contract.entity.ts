import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_contracts')
@Index(['tenant_id', 'asset_id', 'contract_id'], { unique: true })
export class AssetContractLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid')
  contract_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
