import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  DELETING = 'deleting',
  DELETED = 'deleted',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('citext')
  slug!: string;

  @Column('text')
  name!: string;

  @Column('boolean', { default: false })
  is_system_tenant!: boolean;

  @Column({ type: 'enum', enum: TenantStatus, enumName: 'tenant_status', default: TenantStatus.ACTIVE })
  status!: TenantStatus;

  @Column('timestamptz', { nullable: true })
  frozen_at!: Date | null;

  @Column('uuid', { nullable: true })
  frozen_by!: string | null;

  @Column('timestamptz', { nullable: true })
  deletion_requested_at!: Date | null;

  @Column('uuid', { nullable: true })
  deletion_requested_by!: string | null;

  @Column('timestamptz', { nullable: true })
  deletion_confirmed_at!: Date | null;

  @Column('timestamptz', { nullable: true })
  deleted_at!: Date | null;

  @Column('text', { nullable: true })
  deletion_reason!: string | null;

  @Column('uuid', { nullable: true })
  deletion_token!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('text', { nullable: true })
  stripe_customer_id!: string | null;

  @Column('text', { nullable: true })
  billing_email!: string | null;

  @Column('text', { nullable: true })
  billing_company_name!: string | null;

  @Column('text', { nullable: true })
  billing_phone!: string | null;

  @Column('text', { nullable: true })
  billing_tax_id!: string | null;

  @Column('jsonb', { nullable: true, default: () => `'{}'::jsonb` })
  billing_address!: Record<string, any> | null;

  @Column('jsonb', { nullable: true, default: () => `'{}'::jsonb` })
  billing_customer_info!: Record<string, any> | null;

  @Column('jsonb', { nullable: true, default: () => `'{}'::jsonb` })
  billing_invoice_info!: Record<string, any> | null;

  @Column('jsonb', { default: () => `'{}'::jsonb` })
  metadata!: Record<string, any>;

  @Column('text', { default: 'none' })
  sso_provider!: 'none' | 'entra';

  @Column('text', { nullable: true })
  entra_tenant_id!: string | null;

  @Column('boolean', { default: false })
  sso_enabled!: boolean;

  @Column('jsonb', { nullable: true, default: () => `'{}'::jsonb` })
  entra_metadata!: Record<string, any> | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
