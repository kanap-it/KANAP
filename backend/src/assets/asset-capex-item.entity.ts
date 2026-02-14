import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_capex_items')
@Index(['tenant_id', 'asset_id', 'capex_item_id'], { unique: true })
export class AssetCapexItemLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid')
  capex_item_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
