import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_cluster_members')
@Index(['tenant_id', 'cluster_id', 'asset_id'], { unique: true })
@Index(['tenant_id', 'cluster_id'])
@Index(['tenant_id', 'asset_id'])
export class AssetClusterMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  cluster_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
