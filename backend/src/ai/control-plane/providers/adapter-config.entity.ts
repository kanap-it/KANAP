import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_adapter_configs')
@Index(['tenant_id', 'provider_kind', 'provider_key'], { unique: true })
@Index(['tenant_id', 'enabled', 'created_at'])
export class AiAdapterConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  provider_kind!: string;

  @Column('text')
  provider_key!: string;

  @Column('text')
  implementation!: string;

  @Column('text')
  environment!: string;

  @Column('boolean', { default: true })
  enabled!: boolean;

  @Column('text', { nullable: true })
  display_name!: string | null;

  @Column('text', { nullable: true })
  base_url!: string | null;

  @Column('jsonb', { nullable: true })
  credential_ref_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  capability_allowlist_json!: string[] | null;

  @Column('text')
  live_test_safety!: string;

  @Column('int', { nullable: true })
  timeout_seconds!: number | null;

  @Column('jsonb', { nullable: true })
  rate_limit_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
