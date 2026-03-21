import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_conversations')
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'updated_at'])
export class AiConversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text', { nullable: true })
  title!: string | null;

  @Column('varchar', { length: 50, nullable: true })
  provider!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  model!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;

  @Column('timestamptz', { nullable: true })
  archived_at!: Date | null;
}
