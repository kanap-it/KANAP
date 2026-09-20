import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Review state of one external inventory object. */
export type AssetExternalLinkState = 'linked' | 'ambiguous' | 'missing' | 'ignored' | 'error';

@Entity('asset_external_links')
@Index(['tenant_id', 'source', 'external_type', 'external_id'], { unique: true })
@Index(['tenant_id', 'asset_id'])
@Index(['tenant_id', 'source', 'state'])
export class AssetExternalLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  /** Inventory that owns the object, e.g. 'netbox'. */
  @Column('text')
  source!: string;

  /** Object family inside that inventory, e.g. 'device' or 'vm'. */
  @Column('text')
  external_type!: string;

  @Column('text')
  external_id!: string;

  @Column('text', { nullable: true })
  external_name!: string | null;

  @Column('text', { nullable: true })
  external_url!: string | null;

  @Column('uuid', { nullable: true })
  asset_id!: string | null;

  /**
   * The raw status the inventory reports for this object (a Netbox status
   * value, e.g. 'failed'). Informational: the asset's own lifecycle is not
   * driven by it.
   */
  @Column('text', { nullable: true })
  external_status!: string | null;

  @Column('text', { default: 'linked' })
  state!: AssetExternalLinkState;

  /** Assets the matcher could not choose between; only set when state is 'ambiguous'. */
  @Column('uuid', { array: true, default: () => `'{}'::uuid[]` })
  candidate_asset_ids!: string[];

  /**
   * The notice to show about this record, as a code plus its parameters: the
   * pages run in four languages, so the English sentence is rebuilt at read
   * time rather than stored.
   */
  @Column('text', { nullable: true })
  message_code!: string | null;

  @Column('jsonb', { nullable: true })
  message_params!: Record<string, string> | null;

  /**
   * The asset and hardware fields this inventory actually provides a value for
   * on THIS object, refreshed at every run. Netbox has no domain notion, often
   * no platform and sometimes no primary address: a field it says nothing about
   * stays editable in KANAP. NULL means "not known yet" (a record written by an
   * older build, or not synchronised since), and the reader falls back to
   * locking the whole list.
   */
  @Column('text', { array: true, nullable: true })
  managed_fields!: string[] | null;

  @Column('timestamptz', { nullable: true })
  last_seen_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  last_synced_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
