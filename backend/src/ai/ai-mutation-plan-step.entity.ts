import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AiMutationPlanStepStatus =
  | 'waiting_dependency'
  | 'preview_ready'
  | 'executed'
  | 'failed'
  | 'blocked';

@Entity('ai_mutation_plan_steps')
@Index(['tenant_id', 'plan_id'])
@Index(['tenant_id', 'preview_id'])
@Index(['tenant_id', 'status'])
export class AiMutationPlanStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  conversation_id!: string | null;

  @Column('uuid')
  user_id!: string;

  @Column('uuid')
  plan_id!: string;

  @Column('text')
  step_key!: string;

  @Column('text', { nullable: true })
  label!: string | null;

  @Column('text')
  tool_name!: string;

  @Column('jsonb')
  input!: Record<string, unknown>;

  @Column('jsonb', { default: () => "'[]'::jsonb" })
  depends_on!: string[];

  @Column('uuid', { nullable: true })
  preview_id!: string | null;

  @Column('text', { default: 'waiting_dependency' })
  status!: AiMutationPlanStepStatus;

  @Column('text', { nullable: true })
  error_message!: string | null;

  @Column('text', { nullable: true })
  result_entity_type!: string | null;

  @Column('uuid', { nullable: true })
  result_entity_id!: string | null;

  @Column('text', { nullable: true })
  result_ref!: string | null;

  @Column('text', { nullable: true })
  result_title!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
