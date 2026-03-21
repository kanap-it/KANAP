import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_settings')
@Index(['tenant_id'], { unique: true })
export class AiSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('boolean', { default: false })
  chat_enabled!: boolean;

  @Column('boolean', { default: false })
  mcp_enabled!: boolean;

  @Column('varchar', { length: 50, nullable: true })
  llm_provider!: string | null;

  @Column('text', { nullable: true, select: false })
  llm_api_key_encrypted!: string | null;

  @Column('text', { nullable: true })
  llm_endpoint_url!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  llm_model!: string | null;

  @Column('integer', { nullable: true })
  mcp_key_max_lifetime_days!: number | null;

  @Column('integer', { nullable: true })
  conversation_retention_days!: number | null;

  @Column('boolean', { default: false })
  web_enrichment_enabled!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
