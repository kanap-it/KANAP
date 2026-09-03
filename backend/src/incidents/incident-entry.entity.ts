import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const INCIDENT_ENTRY_KINDS = ['note', 'status_change', 'severity_change', 'reopen', 'link_change', 'system'] as const;
export type IncidentEntryKind = (typeof INCIDENT_ENTRY_KINDS)[number];

export type IncidentChangedFields = Record<string, { from: unknown; to: unknown }>;

/**
 * Append-only incident timeline. No updated_at, no update/delete endpoint.
 */
@Entity('incident_entries')
@Index(['tenant_id', 'incident_id', 'occurred_at'])
export class IncidentEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  incident_id!: string;

  @Column('text')
  kind!: IncidentEntryKind;

  @Column('text', { nullable: true })
  content!: string | null;

  @Column('jsonb', { nullable: true })
  changed_fields!: IncidentChangedFields | null;

  // Event time as stated by the author (set at creation only).
  @Column('timestamptz', { default: () => 'now()' })
  occurred_at!: Date;

  @Column('uuid', { nullable: true })
  author_id!: string | null;

  // System time, never user-set.
  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
