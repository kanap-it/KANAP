import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMode, SubscriptionType } from '../../../billing/subscription.entity';

export class UpdateTenantPlanDto {
  @IsOptional()
  @IsString()
  plan_name?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  seat_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  active_seats?: number;

  @IsOptional()
  @IsEnum(SubscriptionType)
  subscription_type?: SubscriptionType;

  @IsOptional()
  @IsEnum(PaymentMode)
  payment_mode?: PaymentMode;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'next_payment_at must be ISO-8601' })
  next_payment_at?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

