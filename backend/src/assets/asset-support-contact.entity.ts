import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_support_contacts')
@Index(['asset_id'])
export class AssetSupportContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid')
  contact_id!: string;

  @Column('text', { nullable: true })
  role!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
