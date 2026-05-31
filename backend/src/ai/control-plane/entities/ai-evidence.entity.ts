import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_evidence')
@Index(['tenant_id', 'run_id', 'created_at'])
@Index(['tenant_id', 'tool_execution_id'])
@Index(['tenant_id', 'action_request_id'])
@Index(['tenant_id', 'source_provider', 'source_object_type', 'created_at'])
export class AiEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  run_id!: string | null;

  @Column('uuid', { nullable: true })
  tool_execution_id!: string | null;

  @Column('uuid', { nullable: true })
  action_request_id!: string | null;

  @Column('text')
  source_provider!: string;

  @Column('text')
  source_object_type!: string;

  @Column('text', { nullable: true })
  source_object_id!: string | null;

  @Column('text', { nullable: true })
  source_uri!: string | null;

  @Column('text')
  trust_level!: string;

  @Column('text')
  redaction_status!: string;

  @Column('text')
  content_hash!: string;

  @Column('text')
  summary!: string;

  @Column('jsonb', { nullable: true })
  payload_json!: Record<string, unknown> | unknown[] | null;

  @Column('text')
  retention_class!: string;

  @Column('timestamptz')
  collected_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
