import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('asset_links')
export class AssetLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  asset_id!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  url!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
