import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('applications')
@Index(['tenant_id', 'name'])
@Index(['tenant_id', 'lifecycle'])
@Index(['tenant_id', 'criticality'])
@Index(['tenant_id', 'category'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('uuid', { nullable: true })
  supplier_id!: string | null;

  @Column('text', { default: 'line_of_business' })
  category!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text', { nullable: true })
  editor!: string | null;

  @Column('date', { nullable: true })
  retired_date!: Date | null;

  @Column('text', { nullable: true })
  version!: string | null;

  @Column('date', { nullable: true })
  end_of_support_date!: Date | null;

  @Column('date', { nullable: true })
  go_live_date!: Date | null;

  @Column('uuid', { nullable: true })
  predecessor_id!: string | null;

  @Column('text', { default: 'active' })
  lifecycle!: string;

  /**
   * @deprecated Use AppInstance.environment going forward.
   */
  @Column('text', { default: 'prod' })
  environment!: 'prod' | 'dev' | 'test' | 'qa' | 'pre_prod' | 'sandbox';

  @Column('text', { default: 'medium' })
  criticality!: 'business_critical' | 'high' | 'medium' | 'low';

  @Column('text', { nullable: true })
  data_class!: string | null;

  /**
   * @deprecated Kept for legacy compatibility; app-level hosting is no longer used for instances.
   */
  @Column('text', { nullable: true })
  hosting_model!: 'on_premise' | 'saas' | 'public_cloud' | 'private_cloud' | null;

  @Column('boolean', { default: false })
  external_facing!: boolean;

  @Column('boolean', { default: false })
  is_suite!: boolean;

  @Column('date', { nullable: true })
  last_dr_test!: Date | null;

  /**
   * @deprecated Use AppInstance.sso_enabled going forward.
   */
  @Column('boolean', { default: false })
  sso_enabled!: boolean;

  /**
   * @deprecated Use AppInstance.mfa_supported going forward.
   */
  @Column('boolean', { default: false })
  mfa_supported!: boolean;

  @Column('boolean', { default: false })
  etl_enabled!: boolean;

  @Column('text', { array: true, default: '{}' })
  access_methods!: string[];

  @Column('boolean', { default: false })
  contains_pii!: boolean;

  @Column('text', { nullable: true })
  licensing!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('text', { nullable: true })
  support_notes!: string | null;

  @Column('text', { nullable: true, default: 'it_users' })
  users_mode!: 'manual' | 'it_users' | 'headcount' | null;

  @Column('integer', { nullable: true })
  users_year!: number | null;

  @Column('int', { nullable: true })
  users_override!: number | null;

  @Column('text', { default: 'enabled' })
  status!: 'enabled' | 'disabled';

  @Column('timestamptz', { nullable: true })
  disabled_at!: Date | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
