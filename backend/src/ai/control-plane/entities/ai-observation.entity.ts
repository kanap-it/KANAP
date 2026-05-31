import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_observations')
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'source_provider', 'source_object_type', 'created_at'])
@Index(['tenant_id', 'status', 'created_at'])
export class AiObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  run_id!: string | null;

  @Column('text')
  observation_type!: string;

  @Column('text')
  status!: string;

  @Column('text')
  source_provider!: string;

  @Column('text')
  source_object_type!: string;

  @Column('text', { nullable: true })
  source_object_id!: string | null;

  @Column('text', { nullable: true })
  severity!: string | null;

  @Column('text')
  summary!: string;

  @Column('jsonb', { nullable: true })
  evidence_ids!: string[] | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  observed_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
