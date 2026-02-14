import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_asset_assignments')
@Index(['tenant_id', 'app_instance_id', 'asset_id', 'role'], { unique: true })
@Index(['tenant_id', 'app_instance_id'])
@Index(['tenant_id', 'asset_id'])
export class AppAssetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  app_instance_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('text')
  role!: string;

  @Column('date', { nullable: true })
  since_date!: Date | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
