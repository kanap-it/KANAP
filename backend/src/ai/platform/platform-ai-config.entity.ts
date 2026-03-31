import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('platform_ai_config')
export class PlatformAiConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('boolean', { default: true, unique: true })
  singleton!: true;

  @Column('varchar', { length: 50 })
  provider!: string;

  @Column('varchar', { length: 100 })
  model!: string;

  @Column('text', { select: false })
  api_key_encrypted!: string;

  @Column('text', { nullable: true })
  endpoint_url!: string | null;

  @Column('integer', { default: 30 })
  rate_limit_tenant_per_minute!: number;

  @Column('integer', { default: 60 })
  rate_limit_user_per_hour!: number;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;

  @Column('uuid', { nullable: true })
  updated_by!: string | null;
}
