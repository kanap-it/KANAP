import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_instances')
@Index(['tenant_id', 'application_id', 'environment'], { unique: true })
@Index(['tenant_id', 'environment'])
@Index(['tenant_id', 'application_id'])
export class AppInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('text')
  environment!: 'prod' | 'pre_prod' | 'qa' | 'test' | 'dev' | 'sandbox';

  @Column('text', { default: 'active' })
  lifecycle!: string;

  @Column('boolean', { default: false })
  sso_enabled!: boolean;

  @Column('boolean', { default: false })
  mfa_supported!: boolean;

  @Column('text', { nullable: true })
  base_url!: string | null;

  @Column('text', { nullable: true })
  region!: string | null;

  @Column('text', { nullable: true })
  zone!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('text', { default: 'enabled' })
  status!: 'enabled' | 'disabled';

  @Column('timestamptz', { nullable: true })
  disabled_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
