import { Body, Controller, Get, Patch, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { BillingService } from './billing.service';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { SubscriptionType } from './subscription.entity';
import { Type } from 'class-transformer';
import type { PlanKey, IntervalKey } from './plans.config';

class CreateCheckoutSessionDto {
  @IsOptional()
  @IsIn(['small', 'standard', 'max'])
  plan_key?: PlanKey;

  @IsOptional()
  @IsIn(['monthly', 'annual'])
  interval?: IntervalKey;

  @IsOptional()
  @IsEnum(SubscriptionType)
  subscription_type?: SubscriptionType;

  @IsOptional()
  @IsString()
  price_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  success_url?: string;

  @IsOptional()
  @IsString()
  cancel_url?: string;

  @IsOptional()
  @IsBoolean()
  allow_promotion_codes?: boolean;
}

class ChangePlanDto {
  @IsIn(['small', 'standard', 'max'])
  plan_key!: PlanKey;

  @IsIn(['monthly', 'annual'])
  subscription_type!: IntervalKey;
}

class RequestInvoiceDto {
  @IsIn(['small', 'standard', 'max'])
  plan_key!: PlanKey;

  @IsIn(['monthly', 'annual'])
  subscription_type!: IntervalKey;
}

class BillingAddressDto {
  @IsOptional()
  @IsString()
  line1?: string | null;

  @IsOptional()
  @IsString()
  line2?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  country?: string | null;
}

class BillingContactDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  company?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  vatNumber?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  address?: BillingAddressDto | null;
}

class OpenPortalDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

class UpdateBillingProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingContactDto)
  customer?: BillingContactDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingContactDto)
  invoice?: BillingContactDto | null;
}

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  async getPlans() {
    return this.billing.getPlans();
  }

  @Get('subscription')
  async subscription(@Req() req: any) {
    return this.billing.getSubscriptionSummary({ manager: req?.queryRunner?.manager, forceStripeRefresh: true });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('billing', 'admin')
  @Post('change-plan')
  async changePlan(@Req() req: any, @Body() body: ChangePlanDto) {
    const tenantId = req?.tenant?.id as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const mg = req?.queryRunner?.manager as import('typeorm').EntityManager | undefined;
    return this.billing.changePlan(tenantId, body.plan_key, body.subscription_type, mg);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('billing', 'admin')
  @Post('request-invoice')
  async requestInvoice(@Req() req: any, @Body() body: RequestInvoiceDto) {
    const tenantId = req?.tenant?.id as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const mg = req?.queryRunner?.manager as import('typeorm').EntityManager | undefined;
    return this.billing.requestInvoice(tenantId, body.plan_key, body.subscription_type, mg);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('billing', 'reader')
  @Get('profile')
  async profile(@Req() req: any) {
    const tenantId = req?.tenant?.id as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const mg = req?.queryRunner?.manager as import('typeorm').EntityManager | undefined;
    const subscription = await this.billing.getSubscriptionSummary({ manager: mg, forceStripeRefresh: true });
    const profile = await this.billing.getBillingProfile({ tenantId });
    return { subscription, ...profile };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('billing', 'admin')
  @Post('portal')
  async openPortal(@Req() req: any, @Body() body: OpenPortalDto) {
    const tenantId = req?.tenant?.id as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const mg = req?.queryRunner?.manager as import('typeorm').EntityManager | undefined;
    const session = await this.billing.createCustomerPortalSession({ tenantId, manager: mg, returnUrl: body?.returnUrl });
    return { url: session.url };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('billing', 'admin')
  @Post('checkout')
  async createCheckout(@Req() req: any, @Body() body: CreateCheckoutSessionDto) {
    const tenantId = req?.tenant?.id as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const mg = req?.queryRunner?.manager as import('typeorm').EntityManager | undefined;
    const session = await this.billing.createCheckoutSession({
      tenantId,
      manager: mg,
      planKey: body.plan_key,
      interval: body.interval,
      subscriptionType: body.subscription_type,
      priceId: body.price_id,
      quantity: body.quantity ?? undefined,
      successUrl: body.success_url,
      cancelUrl: body.cancel_url,
      allowPromotionCodes: body.allow_promotion_codes,
    });
    return { url: session.url, id: session.id };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('billing', 'admin')
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() body: UpdateBillingProfileDto) {
    const tenantId = req?.tenant?.id as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const profile = await this.billing.updateBillingProfile({
      tenantId,
      customer: body.customer ?? undefined,
      invoice: body.invoice ?? undefined,
    });
    return profile;
  }
}
