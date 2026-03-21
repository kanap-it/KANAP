import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_messages')
@Index(['conversation_id', 'created_at'])
@Index(['tenant_id', 'created_at'])
export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  conversation_id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid', { nullable: true })
  user_id!: string | null;

  @Column('varchar', { length: 20 })
  role!: string;

  @Column('text')
  content!: string;

  @Column('jsonb', { nullable: true })
  tool_calls!: Record<string, unknown>[] | null;

  @Column('jsonb', { nullable: true })
  usage_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
