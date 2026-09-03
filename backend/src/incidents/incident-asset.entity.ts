import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('incident_assets')
@Index(['tenant_id', 'asset_id'])
export class IncidentAsset {
  @Column('uuid')
  tenant_id!: string;

  @PrimaryColumn('uuid')
  incident_id!: string;

  @PrimaryColumn('uuid')
  asset_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
