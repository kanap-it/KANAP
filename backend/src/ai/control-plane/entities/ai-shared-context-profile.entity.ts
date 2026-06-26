import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_shared_context_profiles')
@Index(['tenant_id', 'profile_key'], { unique: true })
@Index(['tenant_id', 'status', 'updated_at'])
export class AiSharedContextProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  profile_key!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('jsonb', { default: () => `'{"lines":[]}'::jsonb` })
  content_json!: Record<string, unknown>;

  @Column('text')
  status!: string;

  @Column('int', { default: 1 })
  config_version!: number;

  @Column('uuid', { nullable: true })
  updated_by_user_id!: string | null;

  @Column('jsonb', { nullable: true })
  metadata_json!: Record<string, unknown> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
