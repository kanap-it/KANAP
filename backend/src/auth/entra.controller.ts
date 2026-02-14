import { BadRequestException, Controller, Get, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequireLevel } from './require-level.decorator';
import { EntraAuthService } from './entra-auth.service';
import { TenantsService } from '../tenants/tenants.service';
import { AuthService } from './auth.service';
import { withTenant } from '../common/tenant-runner';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { resolveTenantAppBaseUrl } from '../common/url';
import { parseCookieValue, setRefreshTokenCookie } from './auth-cookie.util';

@Controller('auth/entra')
export class EntraController {
  constructor(
    private readonly entra: EntraAuthService,
    private readonly tenants: TenantsService,
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(EntraController.name);

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireLevel('users', 'admin')
  @Post('setup/start')
  async startSetup(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    if (req?.isPlatformHost) {
      throw new BadRequestException('Entra setup is not available on the platform admin host');
    }
    const tenantMeta = req?.tenant;
    if (!tenantMeta?.id) {
      throw new BadRequestException('TENANT_REQUIRED');
    }

    const { url, nonce } = await this.entra.buildAuthorizationUrl({
      mode: 'setup',
      tenantId: tenantMeta.id,
      redirectTo: '/admin/auth',
    });

    const secureCookie = (process.env.APP_ENV || '').toLowerCase() === 'production'
      || (process.env.NODE_ENV || '').toLowerCase() === 'production';

    res.cookie('entra_nonce', nonce, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });
    return { url };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireLevel('users', 'admin')
  @Get('setup/start')
  async startSetupGet(@Req() req: any, @Res() res: Response) {
    const result = await this.startSetup(req, res as any);
    // For direct browser GET, perform a redirect for convenience
    if (result && (result as any).url) {
      res.redirect((result as any).url);
      return;
    }
    res.status(500).json({ message: 'Failed to start Entra setup' });
  }

  @Get('login')
  async startLogin(@Req() req: any, @Res() res: Response) {
    if (req?.isPlatformHost) {
      throw new BadRequestException('Entra login is not available on the platform admin host');
    }
    const tenantMeta = req?.tenant;
    if (!tenantMeta?.id) {
      throw new BadRequestException('TENANT_REQUIRED');
    }

    const tenant = await this.tenants.findById(tenantMeta.id);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    if (tenant.sso_provider !== 'entra' || !tenant.entra_tenant_id) {
      throw new BadRequestException('SSO_NOT_CONFIGURED');
    }

    const redirectToRaw = req?.query?.redirectTo;
    const redirectTo = typeof redirectToRaw === 'string' && redirectToRaw.trim().length > 0
      ? redirectToRaw
      : '/';

    const { url, nonce } = await this.entra.buildAuthorizationUrl({
      mode: 'login',
      tenantId: tenant.id,
      redirectTo,
    });

    const secureCookie = (process.env.APP_ENV || '').toLowerCase() === 'production'
      || (process.env.NODE_ENV || '').toLowerCase() === 'production';

    res.cookie('entra_nonce', nonce, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    res.redirect(url);
  }

  @Get('callback')
  async callback(@Req() req: any, @Res() res: Response) {
    const nonce = parseCookieValue(req.headers?.cookie as string | undefined, 'entra_nonce');

    const result = await this.entra.handleCallback({
      code: req.query?.code,
      state: req.query?.state,
      nonce,
    });

    const secureCookie = (process.env.APP_ENV || '').toLowerCase() === 'production'
      || (process.env.NODE_ENV || '').toLowerCase() === 'production';

    res.cookie('entra_nonce', '', {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 0,
    });

    const { mode, tenantId, redirectTo, claims, accessToken } = result;
    if (!tenantId) {
      throw new BadRequestException('Missing tenant context');
    }

    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const tid = (claims as any)?.tid as string | undefined;
    if (!tid) {
      throw new BadRequestException('Entra tenant id (tid) is missing');
    }

    if (mode === 'setup') {
      await this.handleSetupCallback(tenantId, tenant.slug, tid, claims, req, res);
      return;
    }

    if (mode === 'login') {
      if (tenant.sso_provider !== 'entra' || !tenant.entra_tenant_id) {
        throw new BadRequestException('SSO_NOT_CONFIGURED');
      }
      if (tenant.entra_tenant_id !== tid) {
        throw new BadRequestException('ENTRA_TENANT_MISMATCH');
      }

      let graphProfile: any = null;
      const enrichEnabled = String(process.env.ENTRA_ENRICH_PROFILE || 'true').toLowerCase() !== 'false';
      if (enrichEnabled && accessToken) {
        try {
          graphProfile = await this.entra.fetchGraphProfile(accessToken);
        } catch (err: any) {
          this.logger.warn(`Graph profile fetch failed: ${err?.message || err}`);
        }
      }

      await this.handleLoginCallback(tenantId, tenant.slug, redirectTo, claims, graphProfile, req, res);
      return;
    }

    throw new BadRequestException('Unsupported Entra callback mode');
  }

  private async handleSetupCallback(
    tenantId: string,
    tenantSlug: string,
    entraTenantId: string,
    claims: any,
    req: any,
    res: Response,
  ) {
    await this.tenants.updateTenant(tenantId, {
      sso_provider: 'entra' as any,
      entra_tenant_id: entraTenantId,
      sso_enabled: true as any,
      entra_metadata: {
        ...(claims?.name ? { display_name: claims.name } : {}),
        ...(claims?.email || claims?.preferred_username
          ? { primary_domain: String(claims.email || claims.preferred_username).split('@')[1] || null }
          : {}),
        connected_at: new Date().toISOString(),
      } as any,
    });

    const baseUrl = resolveTenantAppBaseUrl(req, tenantSlug);
    const normalized = baseUrl.replace(/\/$/, '');
    res.redirect(`${normalized}/admin/auth?setup=success`);
  }

  private async handleLoginCallback(
    tenantId: string,
    tenantSlug: string,
    redirectTo: string | undefined,
    claims: any,
    graphProfile: any,
    req: any,
    res: Response,
  ) {
    const oid = (claims as any)?.oid as string | undefined;
    const emailRaw = (claims as any)?.email || (claims as any)?.preferred_username;
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!oid) {
      throw new BadRequestException('Entra object id (oid) is missing');
    }
    if (!email) {
      throw new BadRequestException('Entra user email is missing');
    }

    const givenName = (graphProfile?.givenName as string | undefined) || (claims as any)?.given_name;
    const familyName = (graphProfile?.surname as string | undefined) || (claims as any)?.family_name;
    let firstName = givenName || '';
    let lastName = familyName || '';
    if (!firstName && !lastName && typeof (graphProfile as any)?.displayName === 'string') {
      const parts = String((graphProfile as any).displayName).trim().split(/\s+/);
      firstName = parts[0] ?? '';
      lastName = parts.slice(1).join(' ') || '';
    }
    if (!firstName && !lastName && typeof (claims as any)?.name === 'string') {
      const parts = String((claims as any).name).trim().split(/\s+/);
      firstName = parts[0] ?? '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const jobTitle = (graphProfile?.jobTitle as string | undefined) || null;
    const businessPhone = Array.isArray(graphProfile?.businessPhones) ? graphProfile.businessPhones[0] || null : null;
    const mobilePhone = (graphProfile?.mobilePhone as string | undefined) || null;

    const user = await withTenant(this.dataSource, tenantId, async (manager) => {
      const repo = manager.getRepository(User);

      let found = await repo.findOne({
        where: {
          external_auth_provider: 'entra' as any,
          external_subject: oid,
        } as any,
        relations: ['role', 'company', 'department'],
      });

      if (!found) {
        found = await repo
          .createQueryBuilder('u')
          .leftJoinAndSelect('u.role', 'role')
          .leftJoinAndSelect('u.company', 'company')
          .leftJoinAndSelect('u.department', 'department')
          .where('LOWER(u.email) = :email', { email })
          .getOne();

        if (found) {
          found.external_auth_provider = 'entra' as any;
          found.external_subject = oid;
          found = await repo.save(found);
        }
      }

      if (!found) {
        const created = await this.users.createUser(
          {
            email,
            first_name: firstName || null,
            last_name: lastName || null,
            job_title: jobTitle || null,
            business_phone: businessPhone || null,
            mobile_phone: mobilePhone || null,
            tenant_id: tenantId,
            role_name: 'Contact',
            password: null,
            status: 'enabled',
          },
          { manager },
        );
        const full = await this.users.findById(created.id, { manager });
        if (!full) {
          throw new BadRequestException('Failed to create user for Entra identity');
        }
        full.external_auth_provider = 'entra' as any;
        full.external_subject = oid;
        found = await repo.save(full);
      }

      // Keep Entra as source of truth when it provides a value; keep local when Entra is empty.
      let needsSave = false;
      if (firstName) { found.first_name = firstName; needsSave = true; }
      if (lastName) { found.last_name = lastName; needsSave = true; }
      if (jobTitle) { found.job_title = jobTitle; needsSave = true; }
      if (businessPhone) { found.business_phone = businessPhone; needsSave = true; }
      if (mobilePhone) { found.mobile_phone = mobilePhone; needsSave = true; }

      if (needsSave) {
        found = await repo.save(found);
      }

      return found;
    });

    const tokens = await this.auth.signTokens({ id: user.id, email: user.email, role: user.role, tenant_id: tenantId });
    // Keep refresh tokens out of JS storage by issuing an httpOnly cookie on callback.
    setRefreshTokenCookie(res, tokens.refresh_token, tokens.refresh_expires_in);
    const baseUrl = resolveTenantAppBaseUrl(req, tenantSlug);
    const normalized = baseUrl.replace(/\/$/, '');
    const redirectPath = redirectTo && typeof redirectTo === 'string' && redirectTo.trim().length > 0 ? redirectTo : '/';
    // Pass tokens in URL fragment to avoid sending them in server logs/referrers.
    const fragment = new URLSearchParams({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: String(tokens.expires_in),
      refreshExpiresIn: String(tokens.refresh_expires_in),
      redirectTo: redirectPath,
    });
    const target = `${normalized}/login/callback#${fragment.toString()}`;
    res.redirect(target);
  }
}
