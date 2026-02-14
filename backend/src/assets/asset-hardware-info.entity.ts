import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_hardware_info')
@Index(['tenant_id', 'asset_id'], { unique: true })
export class AssetHardwareInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('text', { nullable: true })
  serial_number!: string | null;

  @Column('text', { nullable: true })
  manufacturer!: string | null;

  @Column('text', { nullable: true })
  model!: string | null;

  @Column('date', { nullable: true })
  purchase_date!: Date | null;

  @Column('text', { nullable: true })
  rack_location!: string | null;

  @Column('text', { nullable: true })
  rack_unit!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
