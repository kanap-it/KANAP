import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AiMutationPlanStatus =
  | 'active'
  | 'completed'
  | 'failed';

@Entity('ai_mutation_plans')
@Index(['tenant_id', 'conversation_id'])
@Index(['tenant_id', 'status'])
export class AiMutationPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  conversation_id!: string | null;

  @Column('uuid')
  user_id!: string;

  @Column('text', { nullable: true })
  summary!: string | null;

  @Column('text', { default: 'active' })
  status!: AiMutationPlanStatus;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
