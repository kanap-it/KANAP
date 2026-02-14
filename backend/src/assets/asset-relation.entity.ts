import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_relations')
@Index(['tenant_id', 'asset_id', 'related_asset_id', 'relation_type'], { unique: true })
export class AssetRelation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid')
  related_asset_id!: string;

  @Column('text')
  relation_type!: 'contains' | 'depends_on';

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
