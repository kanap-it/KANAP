import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_api_keys')
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'key_prefix'], { unique: true })
@Index(['key_prefix'])
export class AiApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text', { select: false })
  key_hash!: string;

  @Column('varchar', { length: 16 })
  key_prefix!: string;

  @Column('varchar', { length: 100 })
  label!: string;

  @Column('timestamptz', { nullable: true })
  expires_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  last_used_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  revoked_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('uuid')
  created_by_user_id!: string;
}
