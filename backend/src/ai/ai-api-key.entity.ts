import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_api_keys')
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'key_prefix'], { unique: true })
@Index(['key_prefix'])
export class AiApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text', { select: false })
  key_hash!: string;

  @Column('varchar', { length: 16 })
  key_prefix!: string;

  @Column('varchar', { length: 100 })
  label!: string;

  @Column('timestamptz', { nullable: true })
  expires_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  last_used_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  revoked_at!: Date | null;

  @Column('uuid', { nullable: true })
  revoked_by_user_id!: string | null;

  @Column('text', { nullable: true })
  revocation_reason!: string | null;

  @Column('jsonb', { default: () => `'["mcp:tools:list","mcp:tools:execute"]'::jsonb` })
  mcp_scopes_json!: string[];

  @Column('jsonb', { default: () => `'["kanap.read.core"]'::jsonb` })
  mcp_capability_allowlist_json!: string[];

  @Column('jsonb', { default: () => `'[]'::jsonb` })
  mcp_capability_denylist_json!: string[];

  @Column('text', { default: 'read' })
  mcp_max_effect!: string;

  @Column('integer', { default: 60 })
  mcp_rate_limit_per_minute!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('uuid')
  created_by_user_id!: string;
}
