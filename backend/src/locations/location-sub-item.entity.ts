import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('location_sub_items')
@Index(['tenant_id', 'location_id'])
export class LocationSubItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  location_id!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('int', { default: 0 })
  display_order!: number;

  /**
   * External identity, written only by an inventory synchronisation (Netbox
   * today). NULL on every sub-location a person created by hand. The partial
   * unique index that backs the triplet lives in migration 1853590000000.
   */
  @Column('text', { nullable: true })
  external_source!: string | null;

  @Column('text', { nullable: true })
  external_id!: string | null;

  @Column('text', { nullable: true })
  external_url!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
