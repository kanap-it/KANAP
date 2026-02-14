import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_spend_items')
@Index(['tenant_id', 'asset_id', 'spend_item_id'], { unique: true })
export class AssetSpendItemLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid')
  spend_item_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
