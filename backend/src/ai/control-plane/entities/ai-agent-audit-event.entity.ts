import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_agent_audit_events')
@Index(['tenant_id', 'agent_definition_id', 'created_at'])
@Index(['tenant_id', 'event_type', 'created_at'])
@Index(['tenant_id', 'severity', 'created_at'])
export class AiAgentAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  agent_definition_id!: string | null;

  @Column('uuid', { nullable: true })
  work_item_id!: string | null;

  @Column('text')
  event_type!: string;

  @Column('text')
  severity!: string;

  @Column('text')
  message!: string;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
