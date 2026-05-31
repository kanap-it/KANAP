import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_external_mcp_tool_snapshots')
@Index(['tenant_id', 'server_id', 'external_tool_name'], { unique: true })
@Index(['tenant_id', 'capability_name', 'capability_version'], { unique: true })
@Index(['tenant_id', 'server_key', 'enabled'])
export class AiExternalMcpToolSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  server_id!: string;

  @Column('text')
  server_key!: string;

  @Column('text')
  external_tool_name!: string;

  @Column('text')
  capability_name!: string;

  @Column('text')
  capability_version!: string;

  @Column('text', { nullable: true })
  tool_description!: string | null;

  @Column('jsonb')
  input_schema_json!: Record<string, unknown>;

  @Column('text')
  input_schema_hash!: string;

  @Column('text')
  schema_version!: string;

  @Column('text')
  effect!: string;

  @Column('boolean', { default: false })
  enabled!: boolean;

  @Column('boolean', { default: false })
  mcp_exposure_enabled!: boolean;

  @Column('jsonb', { nullable: true })
  redaction_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
