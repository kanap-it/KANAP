import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_approval_policies')
@Index(['tenant_id', 'policy_key', 'policy_version'], { unique: true })
@Index(['tenant_id', 'enabled', 'status'])
@Index(['tenant_id', 'capability_name', 'capability_version', 'effect'])
@Index(['tenant_id', 'provider_kind', 'provider_key', 'environment'])
export class AiApprovalPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  policy_key!: string;

  @Column('int')
  policy_version!: number;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  status!: string;

  @Column('boolean')
  enabled!: boolean;

  @Column('text')
  capability_name!: string;

  @Column('text')
  capability_version!: string;

  @Column('text')
  effect!: string;

  @Column('text', { nullable: true })
  provider_kind!: string | null;

  @Column('text', { nullable: true })
  provider_key!: string | null;

  @Column('text', { nullable: true })
  environment!: string | null;

  @Column('text', { nullable: true })
  trigger_surface!: string | null;

  @Column('text', { nullable: true })
  trigger_kind!: string | null;

  @Column('text')
  max_autonomy_level!: string;

  @Column('text', { nullable: true })
  target_type!: string | null;

  @Column('jsonb', { nullable: true })
  target_constraints_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  evidence_requirements_json!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  evaluation_requirements_json!: Record<string, unknown> | null;

  @Column('double precision', { nullable: true })
  min_confidence!: number | null;

  @Column('int')
  cooldown_seconds!: number;

  @Column('jsonb', { nullable: true })
  budget_constraints_json!: Record<string, unknown> | null;

  @Column('text')
  live_test_safety!: string;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
