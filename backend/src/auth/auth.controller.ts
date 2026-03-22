import { Body, Controller, Post, BadRequestException, Get, Req, Res, UseGuards, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PermissionsService, RESOURCES } from '../permissions/permissions.service';
import { BillingService } from '../billing/billing.service';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../email/email.service';
import { resolveAppBaseUrl } from '../common/url';
import { Features } from '../config/features';
import { throwFeatureDisabled } from '../common/feature-gates';
import { isPlatformAdmin } from './platform-admin.util';
import { FxIngestionService } from '../currency/fx-ingestion.service';
import { DataSource } from 'typeorm';
import { withTenant } from '../common/tenant-runner';
import { requireJwtSecret } from '../common/env';
import { TenantsService } from '../tenants/tenants.service';
import { UserRole } from '../users/user-role.entity';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { RATE_LIMITS } from '../common/rate-limit';
import { Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearRefreshTokenCookie,
  parseCookieValue,
  setRefreshTokenCookie,
} from './auth-cookie.util';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class PasswordResetRequestDto {
  @IsEmail()
  email!: string;
}

class CompletePasswordResetDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

class LogoutDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly perms: PermissionsService,
    private readonly billing: BillingService,
    private readonly emails: EmailService,
    private readonly fxIngestion: FxIngestionService,
    private readonly dataSource: DataSource,
    private readonly tenants: TenantsService,
  ) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.authLogin })
  async login(@Body() body: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    if (!body?.email || !body?.password) throw new BadRequestException('email and password are required');
    const manager = req?.queryRunner?.manager;
    const user = await this.auth.validateUser(body.email, body.password, manager);
    void this.fxIngestion.maybeRefreshOnLogin((user as any)?.tenant_id);
    const tokens = await this.auth.signTokens(
      { id: user.id, email: user.email, role: user.role, tenant_id: (user as any)?.tenant_id },
      manager,
    );
    setRefreshTokenCookie(res, tokens.refresh_token, tokens.refresh_expires_in, req.secure);
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const sub = req?.user?.sub as string | undefined;
    if (!sub) throw new BadRequestException('Invalid token');
    const manager = req?.queryRunner?.manager;
    const user = await this.users.findById(sub, { manager });
    if (!user) throw new BadRequestException('User not found');
    const tenantId = req?.tenant?.id;
    const tenant = tenantId ? await this.tenants.findById(tenantId) : null;
    const tenantAuth = tenant
      ? { sso_provider: tenant.sso_provider ?? 'none', sso_enabled: !!tenant.sso_enabled }
      : { sso_provider: 'none', sso_enabled: false };

    // Load all roles for this user (multi-role support)
    const userRolesRepo = (manager ?? this.dataSource.manager).getRepository(UserRole);
    const userRoles = await userRolesRepo.find({
      where: { user_id: user.id },
      relations: ['role'],
    });

    // Get all role IDs (include legacy role_id for backwards compatibility)
    const roleIds = new Set<string>();
    if (user.role_id) roleIds.add(user.role_id);
    for (const ur of userRoles) roleIds.add(ur.role_id);
    const roleIdArray = Array.from(roleIds);

    // Check if user has Administrator role (any of their roles)
    const roleNames = userRoles.map(ur => ur.role?.role_name?.toLowerCase() ?? '');
    if (user.role?.role_name) roleNames.push(user.role.role_name.toLowerCase());
    const isGlobalAdmin = roleNames.includes('administrator');

    // Compute effective permissions using union logic across all roles
    const permissions: Record<string, 'reader' | 'contributor' | 'member' | 'admin'> = {};
    if (isGlobalAdmin) {
      for (const r of RESOURCES) permissions[r] = 'admin';
    } else {
      const map = await this.perms.listForRoles(roleIdArray, { manager });
      for (const r of RESOURCES) {
        const lv = map.get(r);
        if (lv) permissions[r] = lv;
      }
    }
    const isBillingAdmin = isGlobalAdmin || permissions['billing'] === 'admin';
    const isPlatform = isPlatformAdmin({ email: user.email, role: { role_name: user.role?.role_name ?? null } });

    const subscription = await this.billing.getSubscriptionSummary({ manager });

    // Build roles array for profile (all assigned roles)
    const roles = userRoles
      .filter(ur => ur.role)
      .map(ur => ({
        id: ur.role_id,
        name: ur.role!.role_name,
      }));
    // Include legacy role if not already in list
    if (user.role && !roles.some(r => r.id === user.role_id)) {
      roles.unshift({ id: user.role_id, name: user.role.role_name });
    }

    const profile = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      job_title: user.job_title,
      business_phone: user.business_phone,
      mobile_phone: user.mobile_phone,
      locale: user.locale,
      status: user.status,
      role: user.role?.role_name ?? null, // Primary role name (backwards compat)
      roles, // All assigned roles
      external_auth_provider: user.external_auth_provider ?? null,
    };
    return {
      profile,
      claims: {
        isGlobalAdmin,
        isBillingAdmin,
        isPlatformAdmin: isPlatform,
        permissions,
      },
      subscription,
      tenantAuth,
    };
  }

  @Post('exchange-provisioning-token')
  async exchangeProvisioningToken(@Body() body: { token?: string }) {
    const t = body?.token;
    if (!t) throw new BadRequestException('token is required');
    const secret = requireJwtSecret();
    let payload: any;
    try {
      payload = jwt.verify(t, secret);
    } catch {
      throw new BadRequestException('invalid or expired token');
    }
    if (!payload || payload.purpose !== 'provision' || !payload.tenant_id || !payload.email) {
      throw new BadRequestException('invalid token payload');
    }
    const tenantId = payload.tenant_id as string;
    const user = await withTenant(this.dataSource, tenantId, async (manager) => {
      return this.users.findByEmail(payload.email, { manager });
    });
    if (!user) throw new BadRequestException('user not found');
    return this.auth.signToken({ id: user.id, email: user.email, role: user.role, tenant_id: tenantId });
  }

  @Post('password-reset/request')
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.authPasswordResetRequest })
  async requestPasswordReset(@Body() body: PasswordResetRequestDto, @Req() req: any) {
    if (!Features.EMAIL_ENABLED) throwFeatureDisabled('email');
    const email = body.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email, { manager: req?.queryRunner?.manager });
    if (!user) return { ok: true };

    const token = this.auth.createPasswordResetToken(user);
    const baseUrl = resolveAppBaseUrl(req);
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password#token=${encodeURIComponent(token)}`;
    await this.emails.sendPasswordResetEmail({
      to: email,
      resetUrl,
      expiresInMinutes: this.auth.getPasswordResetExpirationMinutes(),
    });
    return { ok: true };
  }

  @Post('password-reset/complete')
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.authPasswordResetComplete })
  async completePasswordReset(@Body() body: CompletePasswordResetDto, @Req() req: any) {
    const manager = req?.queryRunner?.manager;
    await this.auth.resetPasswordWithToken(body.token, body.password, { manager });
    return { ok: true };
  }

  @Post('refresh')
  async refreshToken(@Body() body: RefreshTokenDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.resolveRefreshToken(req, body);
    if (!refreshToken) throw new BadRequestException('refresh_token is required');
    const manager = req?.queryRunner?.manager;
    const refreshed = await this.auth.refreshAccessToken(refreshToken, req?.tenant?.id, manager);
    setRefreshTokenCookie(res, refreshToken, refreshed.refresh_expires_in, req.secure);
    return refreshed;
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.resolveRefreshToken(req, body);
    clearRefreshTokenCookie(res);
    const manager = req?.queryRunner?.manager;
    if (refreshToken) {
      await this.auth.revokeToken(refreshToken, req?.tenant?.id, manager);
    }
    return { ok: true };
  }

  private resolveRefreshToken(req: any, body?: { refresh_token?: string }): string | undefined {
    const cookieToken = parseCookieValue(req?.headers?.cookie as string | undefined, REFRESH_TOKEN_COOKIE_NAME);
    const bodyToken = body?.refresh_token?.trim();
    if (cookieToken && cookieToken.trim() !== '') return cookieToken;
    if (bodyToken && bodyToken !== '') return bodyToken;
    return undefined;
  }

}
