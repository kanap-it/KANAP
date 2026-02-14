import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_projects')
@Index(['asset_id', 'project_id'], { unique: true })
export class AssetProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
