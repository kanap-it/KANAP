import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum SubscriptionType {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export enum PaymentMode {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

export enum CollectionMethod {
  CHARGE_AUTOMATICALLY = 'charge_automatically',
  SEND_INVOICE = 'send_invoice',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenant_id!: string;

  @Column({ type: 'text', nullable: true })
  plan_name!: string | null;

  @Column({ type: 'int', nullable: true, default: 5 })
  seat_limit!: number | null;

  @Column({ type: 'int', default: 0 })
  active_seats!: number;

  @Column({ type: 'enum', enum: SubscriptionType, enumName: 'subscription_billing_period', default: SubscriptionType.MONTHLY })
  subscription_type!: SubscriptionType;

  @Column({ type: 'enum', enum: PaymentMode, enumName: 'subscription_payment_mode', default: PaymentMode.CARD })
  payment_mode!: PaymentMode;

  @Column({ type: 'timestamptz', nullable: true })
  next_payment_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  canceled_at_effective!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_synced_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true })
  stripe_customer_id!: string | null;

  @Column({ type: 'text', nullable: true })
  stripe_subscription_id!: string | null;

  @Column({ type: 'enum', enum: SubscriptionStatus, enumName: 'subscription_status', nullable: true })
  status!: SubscriptionStatus | null;

  @Column({ type: 'enum', enum: CollectionMethod, enumName: 'subscription_collection_method', nullable: true })
  collection_method!: CollectionMethod | null;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_start!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_end!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  trial_end!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancel_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  canceled_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  currency!: string | null;

  @Column({ type: 'int', nullable: true })
  amount!: number | null;

  @Column({ type: 'text', nullable: true })
  stripe_product_id!: string | null;

  @Column({ type: 'text', nullable: true })
  stripe_price_id!: string | null;

  @Column({ type: 'text', nullable: true })
  default_payment_method_id!: string | null;

  @Column({ type: 'text', nullable: true })
  default_payment_method_brand!: string | null;

  @Column({ type: 'text', nullable: true })
  default_payment_method_last4!: string | null;

  @Column({ type: 'text', nullable: true })
  latest_invoice_id!: string | null;

  @Column({ type: 'text', nullable: true })
  latest_invoice_status!: string | null;

  @Column({ type: 'text', nullable: true })
  latest_invoice_number!: string | null;

  @Column({ type: 'text', nullable: true })
  latest_invoice_url!: string | null;

  @Column({ type: 'text', nullable: true })
  latest_invoice_pdf!: string | null;

  @Column({ type: 'int', nullable: true })
  latest_invoice_amount!: number | null;

  @Column({ type: 'text', nullable: true })
  latest_invoice_currency!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  latest_invoice_created!: Date | null;

  @Column({ type: 'int', nullable: true })
  days_until_due!: number | null;

  @Column({ type: 'text', nullable: true })
  last_payment_error_code!: string | null;

  @Column({ type: 'text', nullable: true })
  last_payment_error_message!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
