import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AiMutationPreviewStatus } from './ai.types';

@Entity('ai_mutation_previews')
@Index(['tenant_id', 'conversation_id'])
@Index(['tenant_id', 'status', 'expires_at'])
export class AiMutationPreview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  conversation_id!: string | null;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  tool_name!: string;

  @Column('text')
  target_entity_type!: string;

  @Column('uuid', { nullable: true })
  target_entity_id!: string | null;

  @Column('jsonb')
  mutation_input!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  current_values!: Record<string, unknown> | null;

  @Column('text', { default: 'pending' })
  status!: AiMutationPreviewStatus;

  @Column('timestamptz', { nullable: true })
  approved_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  rejected_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  executed_at!: Date | null;

  @Column('timestamptz')
  expires_at!: Date;

  @Column('text', { nullable: true })
  error_message!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
