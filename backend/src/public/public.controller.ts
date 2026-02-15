import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { Features } from '../config/features';
import { throwNotAvailableInMode } from '../common/feature-gates';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { ChartOfAccountsService } from '../accounts/chart-of-accounts.service';
import { DataSource } from 'typeorm';
import { TrialSignup } from './trial-signup.entity';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { StatusState } from '../common/status';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { RATE_LIMITS } from '../common/rate-limit';
import { TurnstileService } from './turnstile.service';
import { Subscription, SubscriptionStatus } from '../billing/subscription.entity';
import { TRIAL_PERIOD_DAYS } from '../billing/plans.config';
import { StripeClientService } from '../billing/stripe';
import { isReservedTenantSlug, normalizeTenantSlug } from '../tenants/tenant-slug-policy';

const STRIPE_EU_BANK_TRANSFER_COUNTRIES = new Set<string>(['BE', 'DE', 'ES', 'FR', 'IE', 'NL']);
const STRIPE_DEFAULT_EU_BANK_TRANSFER_COUNTRY = 'FR';

class StartTrialDto {
  @IsString()
  @MinLength(2)
  org!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  country_iso!: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}

class ActivateTrialDto {
  @IsString()
  token!: string;
}

class SendContactDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  company!: string;

  @IsString()
  @MinLength(10)
  message!: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}

class RequestSupportInvoiceDto {
  @IsString()
  @MinLength(2)
  company_name!: string;

  @IsString()
  @MinLength(2)
  contact_name!: string;

  @IsEmail()
  billing_email!: string;

  @IsString()
  @IsOptional()
  address_line1?: string;

  @IsString()
  @IsOptional()
  address_line2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsString()
  @MinLength(2)
  country!: string;

  @IsString()
  @IsOptional()
  vat_id?: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}

@Controller('public')
export class PublicController {
  private readonly logger = new Logger(PublicController.name);

  constructor(
    private readonly tenants: TenantsService,
    private readonly users: UsersService,
    private readonly companies: CompaniesService,
    private readonly dataSource: DataSource,
    private readonly emails: EmailService,
    private readonly auth: AuthService,
    @InjectRepository(TrialSignup)
    private readonly trialSignups: Repository<TrialSignup>,
    private readonly coas: ChartOfAccountsService,
    private readonly turnstile: TurnstileService,
    private readonly stripeClient: StripeClientService,
  ) {}

  @Get('tenant-info')
  async tenantInfo(@Req() req: any) {
    if (req?.isPlatformHost) {
      return { platform: true };
    }
    const tenant = req?.tenant;
    if (tenant?.id) {
      const detail = await this.tenants.findById(tenant.id);
      return { slug: tenant.slug, name: detail?.name ?? tenant.slug };
    }
    return { marketing: true };
  }

  @Get('captcha-config')
  getCaptchaConfig() {
    return this.turnstile.getClientConfig();
  }

  @Post('start-trial')
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.publicStartTrial })
  async startTrial(@Body() body: StartTrialDto, @Req() req: any) {
    if (Features.SINGLE_TENANT) throwNotAvailableInMode();
    await this.turnstile.verifyOrThrow({
      token: body.captchaToken,
      remoteIp: this.resolveClientIp(req),
      action: 'start-trial',
    });

    const org = body.org.trim();
    const slug = normalizeTenantSlug(body.slug);
    const email = body.email.trim().toLowerCase();
    const countryIso = body.country_iso.trim().toUpperCase();

    if (isReservedTenantSlug(slug)) {
      throw new BadRequestException({ code: 'SUBDOMAIN_NOT_AVAILABLE', message: 'Slug not available' });
    }

    // Only block if a non-deleted tenant currently owns the slug
    const existingTenant = await this.tenants.findBySlug(slug);
    if (existingTenant) {
      throw new BadRequestException({ code: 'SUBDOMAIN_NOT_AVAILABLE', message: 'Slug not available' });
    }

    // Reuse existing signup record even if it was previously activated.
    // This enables re-starting a trial after a tenant deletion for the same slug.
    let signup = await this.trialSignups.findOne({ where: { slug } });

    const token = randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.trialLinkTtlMs());

    if (!signup) {
      signup = this.trialSignups.create({
        org_name: org,
        slug,
        email,
        country_iso: countryIso,
        token_hash: hash,
        expires_at: expiresAt,
        last_email_sent_at: now,
        activated_at: null,
      });
    } else {
      signup.org_name = org;
      signup.email = email;
      signup.country_iso = countryIso;
      signup.token_hash = hash;
      signup.expires_at = expiresAt;
      signup.last_email_sent_at = now;
      signup.activated_at = null;
    }

    await this.trialSignups.save(signup);

    const activationUrl = `${this.resolveMarketingBaseUrl(req)}/activate.html#token=${token}`;

    try {
      await this.emails.send({
        to: email,
        subject: 'Confirm your KANAP workspace',
        html: this.renderActivationHtml(email, activationUrl, org),
        text: this.renderActivationText(email, activationUrl, org),
      });
    } catch (error: any) {
      if (error?.code === 'FEATURE_DISABLED') {
        return { ok: true, activation_url: activationUrl };
      }
      throw error;
    }

    return { ok: true };
  }

  @Post('contact')
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.publicContact })
  async sendContact(@Body() body: SendContactDto, @Req() req: any) {
    await this.turnstile.verifyOrThrow({
      token: body.captchaToken,
      remoteIp: this.resolveClientIp(req),
      action: 'contact',
    });

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const company = body.company.trim();
    const message = body.message.trim();

    const subject = `Contact form submission from ${name} (${company})`;
    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #111; line-height: 1.5;">
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${this.escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${this.escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${this.escapeHtml(company)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 16px; border-radius: 4px;">${this.escapeHtml(message)}</p>
      </div>
    `;
    const text = `New contact form submission\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Company: ${company}\n\n` +
      `Message:\n${message}`;

    await this.emails.send({
      to: 'support@kanap.net',
      subject,
      html,
      text,
      replyTo: email,
    });

    return { ok: true };
  }

  @Post('request-support-invoice')
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.publicRequestSupportInvoice })
  async requestSupportInvoice(@Body() body: RequestSupportInvoiceDto, @Req() req: any) {
    if (Features.SINGLE_TENANT) throwNotAvailableInMode();
    await this.turnstile.verifyOrThrow({
      token: body.captchaToken,
      remoteIp: this.resolveClientIp(req),
      action: 'support-invoice',
    });

    const stripe = this.stripeClient.getClient();
    if (!stripe) throw new InternalServerErrorException('Stripe is not configured');
    const priceId = (process.env.STRIPE_PRICE_ENTERPRISE_SUPPORT_ANNUAL || '').trim();
    if (!priceId) throw new InternalServerErrorException('Enterprise Support price not configured');

    let customer: any;
    try {
      customer = await stripe.customers.create({
        name: body.company_name,
        email: body.billing_email,
        metadata: {
          contact_name: body.contact_name,
          billing_channel: 'enterprise-support',
        },
        address: {
          line1: body.address_line1 || '',
          line2: body.address_line2 || '',
          city: body.city || '',
          postal_code: body.postal_code || '',
          country: body.country || '',
        },
        tax_id_data: body.vat_id ? [{ type: 'eu_vat' as const, value: body.vat_id }] : undefined,
      });
    } catch (error: any) {
      this.throwSupportInvoiceStripeError(error);
    }

    let subscription: any;
    const euBankTransferCountry = this.resolveEuBankTransferCountry(body.country);
    try {
      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId, quantity: 1 }],
        collection_method: 'send_invoice',
        days_until_due: 30,
        payment_settings: this.buildSupportInvoicePaymentSettings(euBankTransferCountry),
        metadata: { billing_channel: 'enterprise-support', company_name: body.company_name },
        expand: ['latest_invoice'],
      });
    } catch (error: any) {
      this.throwSupportInvoiceStripeError(error);
    }

    const latestInvoice = await this.finalizeAndSendSupportInvoice(stripe, subscription?.latest_invoice);
    if (latestInvoice?.id) {
      this.logger.log(
        `Enterprise support invoice ${latestInvoice.id} created with card + bank transfer (country=${euBankTransferCountry})`,
      );
    }

    // Send admin notification email (if configured)
    const notifyEmail = process.env.ENTERPRISE_SUPPORT_NOTIFY_EMAIL;
    if (notifyEmail) {
      try {
        const subject = `New Enterprise Support request: ${body.company_name}`;
        const html = `
          <div style="font-family: Arial, sans-serif; font-size: 16px; color: #111; line-height: 1.5;">
            <h2>New Enterprise Support request</h2>
            <p><strong>Company:</strong> ${this.escapeHtml(body.company_name)}</p>
            <p><strong>Contact:</strong> ${this.escapeHtml(body.contact_name)}</p>
            <p><strong>Email:</strong> ${this.escapeHtml(body.billing_email)}</p>
            <p><strong>Country:</strong> ${this.escapeHtml(body.country)}</p>
            <p><strong>VAT:</strong> ${this.escapeHtml(body.vat_id || 'N/A')}</p>
          </div>
        `;
        const text = `Company: ${body.company_name}\n` +
          `Contact: ${body.contact_name}\n` +
          `Email: ${body.billing_email}\n` +
          `Country: ${body.country}\n` +
          `VAT: ${body.vat_id || 'N/A'}`;
        await this.emails.send({ to: notifyEmail, subject, html, text });
      } catch (e: any) {
        if (e?.code !== 'FEATURE_DISABLED') {
          const msg = typeof e?.message === 'string' ? e.message : '';
          console.warn('[email] Failed to send enterprise support notification:', msg);
        }
      }
    }

    return {
      ok: true,
      hosted_invoice_url: latestInvoice?.hosted_invoice_url ?? null,
      invoice_number: latestInvoice?.number ?? null,
      invoice_status: latestInvoice?.status ?? null,
    };
  }

  @Post('activate-trial')
  async activateTrial(@Body() body: ActivateTrialDto, @Req() req: any) {
    if (Features.SINGLE_TENANT) throwNotAvailableInMode();
    const token = body.token?.trim();
    if (!token) throw new BadRequestException('token is required');

    const hash = this.hashToken(token);
    const signup = await this.trialSignups.findOne({ where: { token_hash: hash } });
    if (!signup) throw new BadRequestException('invalid or expired token');
    if (signup.activated_at) throw new BadRequestException('token already used');
    if (signup.expires_at && signup.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('token expired');
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    let tenant: any;
    let owner: any;
    try {
      tenant = await this.tenants.findBySlug(signup.slug, { manager: runner.manager });
      if (tenant) throw new BadRequestException('Tenant already exists');

      tenant = await this.tenants.createTenant({ slug: signup.slug, name: signup.org_name }, { manager: runner.manager });

      await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

      // Provision default global CoA from platform template if available
      await this.provisionDefaultGlobalCoa(runner.manager);

      const provisionalPassword = randomBytes(18).toString('base64url');
      owner = await this.users.createUser({
        email: signup.email,
        password: provisionalPassword,
        role_name: 'Administrator',
        tenant_id: tenant.id,
      }, { manager: runner.manager });

      const companyName = this.buildCompanyName(signup);
      await this.companies.create({
        name: companyName,
        country_iso: (signup.country_iso || 'FR'),
        city: 'Unknown',
        status: StatusState.ENABLED,
      }, owner.id, { manager: runner.manager });

      await runner.manager.getRepository(TrialSignup).update(signup.id, {
        activated_at: new Date(),
        token_hash: null,
        expires_at: null,
      });

      // Create trial subscription (local only, no Stripe)
      await runner.manager.getRepository(Subscription).save({
        tenant_id: tenant.id,
        status: SubscriptionStatus.TRIALING,
        trial_end: new Date(Date.now() + TRIAL_PERIOD_DAYS * 86400000),
        plan_name: 'Trial',
        seat_limit: null, // unlimited during trial
        active_seats: 0,
      });

      await runner.commitTransaction();
    } catch (error) {
      try {
        await runner.rollbackTransaction();
      } catch {}
      throw error;
    } finally {
      try {
        await runner.release();
      } catch {}
    }

    // Fire-and-forget admin notification about tenant creation (non-blocking)
    try {
      const subject = `New tenant created: ${tenant.name} (${signup.slug})`;
      const safe = (v: string) => this.escapeHtml(v ?? '');
      const countryIso = signup.country_iso || 'FR';
      const html = `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #111; line-height: 1.5;">
          <h2>New tenant created</h2>
          <p><strong>Name:</strong> ${safe(tenant.name)}</p>
          <p><strong>Slug:</strong> ${safe(signup.slug)}</p>
          <p><strong>Registered email:</strong> ${safe(signup.email)}</p>
          <p><strong>Country:</strong> ${safe(countryIso)}</p>
        </div>
      `;
      const text = `New tenant created\n\n` +
        `Name: ${tenant.name}\n` +
        `Slug: ${signup.slug}\n` +
        `Registered email: ${signup.email}\n` +
        `Country: ${countryIso}`;
      await this.emails.send({ to: 'admin@kanap.net', subject, html, text });
    } catch (e: any) {
      if (e?.code !== 'FEATURE_DISABLED') {
        // Log but do not block activation response
        const msg = typeof e?.message === 'string' ? e.message : '';
        console.warn('[email] Failed to send new-tenant notification:', msg);
      }
    }

    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
    const tenantUrl = this.computeTenantUrl(proto, host, signup.slug);
    const resetToken = this.auth.createPasswordResetToken({ id: owner.id, email: owner.email, tenant_id: tenant.id });

    return { tenant_url: tenantUrl, reset_token: resetToken };
  }

  // Create a tenant CoA from the single global template marked loaded_by_default, if present
  private async provisionDefaultGlobalCoa(manager: DataSource['manager']) {
    try {
      const rows: Array<{ id: string; template_code: string; template_name: string }>
        = await manager.query(`SELECT id, template_code, template_name FROM coa_templates WHERE is_global = true AND loaded_by_default = true LIMIT 1`);
      const tmpl = rows?.[0];
      if (!tmpl) return;
      // Create tenant CoA from a global template with GLOBAL scope (no country), not country-default
      const created = await this.coas.create({ code: tmpl.template_code, name: tmpl.template_name, scope: 'GLOBAL', is_default: false }, null, { manager });
      // Copy accounts into CoA
      await this.coas.loadTemplateIntoCoa(created.id, tmpl.id, { dryRun: false, userId: null, overwrite: true }, { manager });
      // Mark as global default for the tenant
      await this.coas.setGlobalDefault(created.id, { manager });
    } catch (e) {
      // Swallow provisioning issues to not block tenant creation, but log
      console.warn('[provisioning] Default global CoA provisioning skipped:', (e as Error)?.message);
    }
  }

  private computeTenantUrl(proto: string, host: string, slug: string): string {
    const h = (host || '').toLowerCase();
    if (h.endsWith('lvh.me')) return `${proto}://${slug}.lvh.me`;
    if (h.endsWith('dev.kanap.net')) return `${proto}://${slug}.dev.kanap.net`;
    if (h.endsWith('qa.kanap.net')) return `${proto}://${slug}.qa.kanap.net`;
    return `${proto}://${slug}.kanap.net`;
  }

  private resolveMarketingBaseUrl(req: any): string {
    const configured = process.env.MARKETING_BASE_URL;
    if (configured && configured.trim() !== '') {
      return configured.replace(/\/$/, '');
    }
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    if (!host) throw new BadRequestException('Unable to resolve marketing host');
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private trialLinkTtlMs() {
    return 1000 * 60 * 60 * 48; // 48 hours
  }

  private renderActivationHtml(email: string, activationUrl: string, org?: string) {
    const greeting = this.nameFromEmail(email, org);
    return `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #111; line-height: 1.5;">
        <p>Hello ${greeting},</p>
        <p>Thanks for your interest in KANAP. Please confirm your email to provision your tenant.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${activationUrl}" style="background: #1976d2; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">Activate my workspace</a>
        </p>
        <p>If the button above does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">
          <a href="${activationUrl}">${activationUrl}</a>
        </p>
        <p>The link expires in 48 hours. If you did not request this trial you can ignore this message.</p>
        <p style="margin-top: 32px;">- The KANAP team</p>
      </div>
    `;
  }

  private renderActivationText(email: string, activationUrl: string, org?: string) {
    const greeting = this.nameFromEmail(email, org);
    return `Hello ${greeting},\n\n` +
      `Thanks for your interest in KANAP. Confirm your email to provision your tenant.\n\n` +
      `Activate your workspace: ${activationUrl}\n\n` +
      `The link expires in 48 hours. If you did not request this trial you can ignore this message.\n\n` +
      `- The KANAP team`;
  }

  private buildCompanyName(signup: TrialSignup) {
    if (signup.org_name && signup.org_name.trim().length > 0) return signup.org_name.trim();
    const source = signup.slug ?? 'Tenant';
    return source.charAt(0).toUpperCase() + source.slice(1);
  }

  private nameFromEmail(email: string, fallback?: string) {
    if (email && typeof email === 'string') {
      const local = email.split('@')[0] ?? '';
      if (local) {
        const token = local.split(/[._-]/)[0] ?? '';
        if (token) {
          return token.charAt(0).toUpperCase() + token.slice(1);
        }
      }
    }
    const base = (fallback && fallback.trim().split(/[\s]/)[0]) || 'there';
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }

  private resolveClientIp(req: any): string | null {
    const cfIp = String(req?.headers?.['cf-connecting-ip'] || '').trim();
    if (cfIp) return cfIp;

    const forwarded = String(req?.headers?.['x-forwarded-for'] || '').trim();
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }

    const ip = String(req?.ip || '').trim();
    return ip || null;
  }

  private extractInvoiceId(source: any): string | null {
    if (!source) return null;
    if (typeof source === 'string') return source;
    if (typeof source === 'object' && typeof source.id === 'string') return source.id;
    return null;
  }

  private async finalizeAndSendSupportInvoice(stripe: any, latestInvoice: any): Promise<any | null> {
    const invoiceId = this.extractInvoiceId(latestInvoice);
    if (!invoiceId) return null;

    let invoice: any = latestInvoice;
    if (!invoice || typeof invoice !== 'object') {
      invoice = await stripe.invoices.retrieve(invoiceId);
    }

    if (invoice?.status === 'draft') {
      invoice = await stripe.invoices.finalizeInvoice(invoiceId, { auto_advance: true });
    } else if (!invoice?.status || !invoice?.hosted_invoice_url) {
      invoice = await stripe.invoices.retrieve(invoiceId);
    }

    if (invoice?.collection_method === 'send_invoice' && invoice?.status === 'open') {
      try {
        invoice = await stripe.invoices.sendInvoice(invoiceId);
      } catch (error: any) {
        const msg = typeof error?.message === 'string' ? error.message : 'unknown';
        this.logger.warn(`Unable to send enterprise support invoice ${invoiceId}: ${msg}`);
      }
      if (!invoice?.hosted_invoice_url) {
        try {
          invoice = await stripe.invoices.retrieve(invoiceId);
        } catch (error: any) {
          const msg = typeof error?.message === 'string' ? error.message : 'unknown';
          this.logger.warn(`Unable to refresh enterprise support invoice ${invoiceId}: ${msg}`);
        }
      }
    }

    return invoice;
  }

  private buildSupportInvoicePaymentSettings(bankTransferCountry: string): any {
    return {
      payment_method_types: ['card', 'customer_balance'],
      payment_method_options: {
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: {
            type: 'eu_bank_transfer',
            eu_bank_transfer: {
              country: bankTransferCountry,
            },
          },
        },
      },
    };
  }

  private resolveEuBankTransferCountry(sourceCountry?: string | null): string {
    const configured = String(process.env.STRIPE_EU_BANK_TRANSFER_COUNTRY || '').trim().toUpperCase();
    if (STRIPE_EU_BANK_TRANSFER_COUNTRIES.has(configured)) {
      return configured;
    }
    const source = String(sourceCountry || '').trim().toUpperCase();
    if (STRIPE_EU_BANK_TRANSFER_COUNTRIES.has(source)) {
      return source;
    }
    return STRIPE_DEFAULT_EU_BANK_TRANSFER_COUNTRY;
  }

  private throwSupportInvoiceStripeError(error: any): never {
    const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
    const messageLower = rawMessage.toLowerCase();
    const code = typeof error?.code === 'string' ? error.code : '';

    if (messageLower.includes('eu_vat') || messageLower.includes('vat') || code === 'invalid_tax_id') {
      throw new BadRequestException('Invalid VAT number. Please enter a valid EU VAT ID.');
    }
    if (code === 'email_invalid') {
      throw new BadRequestException('Invalid billing email address.');
    }
    if (rawMessage) {
      throw new BadRequestException(rawMessage);
    }
    throw new BadRequestException('Unable to create invoice request.');
  }
}
