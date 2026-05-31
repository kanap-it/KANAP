import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_approvals')
@Index(['tenant_id', 'action_request_id', 'status'])
@Index(['tenant_id', 'capability_name', 'capability_version', 'created_at'])
@Index(['tenant_id', 'expires_at'])
@Index(['tenant_id', 'matched_policy_id'])
export class AiApproval {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  action_request_id!: string;

  @Column('text')
  capability_name!: string;

  @Column('text')
  capability_version!: string;

  @Column('text')
  source!: string;

  @Column('text')
  status!: string;

  @Column('uuid', { nullable: true })
  actor_user_id!: string | null;

  @Column('text', { nullable: true })
  actor_label!: string | null;

  @Column('text')
  input_hash!: string;

  @Column('jsonb', { nullable: true })
  evidence_ids!: string[] | null;

  @Column('text', { nullable: true })
  reason!: string | null;

  @Column('uuid', { nullable: true })
  matched_policy_id!: string | null;

  @Column('int', { nullable: true })
  matched_policy_version!: number | null;

  @Column('jsonb', { nullable: true })
  decision_json!: Record<string, unknown> | null;

  @Column('timestamptz')
  expires_at!: Date;

  @Column('timestamptz', { nullable: true })
  decided_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
