import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_live_test_targets')
@Index(['tenant_id', 'provider_kind', 'provider_key', 'environment', 'target_kind', 'target_key'], { unique: true })
@Index(['tenant_id', 'provider_kind', 'allowed_effect', 'enabled'])
@Index(['tenant_id', 'expires_at'])
export class AiLiveTestTarget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  provider_kind!: string;

  @Column('text')
  provider_key!: string;

  @Column('text')
  environment!: string;

  @Column('text')
  target_kind!: string;

  @Column('text')
  target_key!: string;

  @Column('text')
  external_ref!: string;

  @Column('text')
  allowed_effect!: string;

  @Column('text')
  safety_label!: string;

  @Column('boolean', { default: false })
  enabled!: boolean;

  @Column('timestamptz', { nullable: true })
  expires_at!: Date | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  redaction_policy_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
