import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_automation_job_catalog')
@Index(['tenant_id', 'provider_key', 'job_key'], { unique: true })
@Index(['tenant_id', 'provider_key', 'environment', 'enabled'])
@Index(['tenant_id', 'launch_allowed', 'enabled'])
export class AiAutomationJobCatalog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  provider_key!: string;

  @Column('text')
  job_key!: string;

  @Column('text')
  catalog_version!: string;

  @Column('text')
  display_name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  environment!: string;

  @Column('text')
  external_job_template_ref!: string;

  @Column('boolean', { default: true })
  enabled!: boolean;

  @Column('boolean', { default: false })
  launch_allowed!: boolean;

  @Column('boolean', { default: true })
  dry_run_supported!: boolean;

  @Column('boolean', { default: true })
  dry_run_required!: boolean;

  @Column('jsonb')
  variable_schema_json!: Record<string, unknown>;

  @Column('jsonb')
  target_policy_json!: Record<string, unknown>;

  @Column('int')
  blast_radius_limit!: number;

  @Column('int')
  cooldown_seconds!: number;

  @Column('int')
  timeout_seconds!: number;

  @Column('jsonb', { nullable: true })
  redaction_policy_json!: Record<string, unknown> | null;

  @Column('text')
  live_test_safety!: string;

  @Column('boolean', { default: false })
  cancel_allowed!: boolean;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
