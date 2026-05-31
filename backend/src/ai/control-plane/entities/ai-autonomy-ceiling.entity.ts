import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_autonomy_ceilings')
@Index(['tenant_id', 'scope', 'enabled'])
@Index(['tenant_id', 'environment'])
@Index(['tenant_id', 'capability_name', 'capability_version'])
@Index(['tenant_id', 'provider_kind', 'provider_key'])
export class AiAutonomyCeiling {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  scope!: string;

  @Column('text', { nullable: true })
  environment!: string | null;

  @Column('text', { nullable: true })
  capability_name!: string | null;

  @Column('text', { nullable: true })
  capability_version!: string | null;

  @Column('text', { nullable: true })
  provider_kind!: string | null;

  @Column('text', { nullable: true })
  provider_key!: string | null;

  @Column('text')
  max_autonomy_level!: string;

  @Column('boolean')
  enabled!: boolean;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
