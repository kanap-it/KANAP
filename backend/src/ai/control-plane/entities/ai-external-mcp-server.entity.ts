import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_external_mcp_servers')
@Index(['tenant_id', 'server_key'], { unique: true })
@Index(['tenant_id', 'enabled', 'created_at'])
@Index(['tenant_id', 'transport_kind', 'enabled'])
export class AiExternalMcpServer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  server_key!: string;

  @Column('text', { nullable: true })
  display_name!: string | null;

  @Column('text')
  transport_kind!: string;

  @Column('jsonb', { nullable: true })
  endpoint_config_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  credential_ref_json!: Record<string, unknown> | null;

  @Column('boolean', { default: false })
  enabled!: boolean;

  @Column('text')
  max_effect!: string;

  @Column('jsonb', { nullable: true })
  redaction_policy_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
