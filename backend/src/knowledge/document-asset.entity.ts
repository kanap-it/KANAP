import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_assets')
@Index(['tenant_id', 'asset_id'])
@Index(['document_id', 'asset_id'], { unique: true })
export class DocumentAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  document_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
