import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_support_info')
@Index(['tenant_id', 'asset_id'], { unique: true })
export class AssetSupportInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid', { nullable: true })
  vendor_id!: string | null;

  @Column('uuid', { nullable: true })
  support_contract_id!: string | null;

  @Column('text', { nullable: true })
  support_tier!: string | null;

  @Column('date', { nullable: true })
  support_expiry!: Date | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
