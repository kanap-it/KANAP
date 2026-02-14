import { BadRequestException, Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { contentDisposition } from '../common/content-disposition';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { resolveAppBaseUrl } from '../common/url';
import {
  PortfolioStatusChangeReportService,
  StatusChangeItemType,
  StatusChangeReportQuery,
} from './services/portfolio-status-change-report.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseCsv = (value?: unknown): string[] => {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

const parseItemTypes = (value?: unknown): StatusChangeItemType[] => {
  const allowed = new Set<StatusChangeItemType>(['task', 'request', 'project']);
  return parseCsv(value).filter((itemType): itemType is StatusChangeItemType => {
    return allowed.has(itemType as StatusChangeItemType);
  });
};

const normalizeProto = (value?: unknown): 'http' | 'https' => {
  const raw = String(value ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return raw === 'http' ? 'http' : 'https';
};

const normalizeHost = (value?: unknown): string => {
  return String(value ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0]
    .trim();
};

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioStatusChangeReportController {
  constructor(private readonly svc: PortfolioStatusChangeReportService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('status-change')
  list(
    @Query() query: any,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.list(this.parseQuery(query, ctx), { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('status-change/filter-values')
  listFilterValues(
    @Query() query: any,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listFilterValues(this.parseQuery(query, ctx), { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('status-change/export')
  async export(
    @Query() query: any,
    @Tenant() ctx: TenantRequest,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const parsed = this.parseQuery(query, ctx);
    const format = String(query?.format || 'csv').toLowerCase();
    const tenantSlug = String(req?.tenant?.slug || '').trim().toLowerCase() || null;

    if (format === 'xlsx') {
      const appBaseUrl = this.resolveExportBaseUrl(req, tenantSlug);
      const result = await this.svc.exportXlsx(parsed, appBaseUrl, { manager: ctx.manager });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', contentDisposition(result.filename));
      res.send(result.content);
      return;
    }

    const result = await this.svc.exportCsv(parsed, { manager: ctx.manager });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    res.send(result.content);
  }

  private parseQuery(query: any, ctx: TenantRequest): StatusChangeReportQuery {
    const startDate = String(query?.startDate || '').trim();
    const endDate = String(query?.endDate || '').trim();

    if (!DATE_PATTERN.test(startDate)) {
      throw new BadRequestException('startDate is required and must use YYYY-MM-DD format');
    }
    if (!DATE_PATTERN.test(endDate)) {
      throw new BadRequestException('endDate is required and must use YYYY-MM-DD format');
    }
    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    return {
      tenantId: ctx.tenantId,
      startDate,
      endDate,
      statuses: parseCsv(query?.statuses),
      itemTypes: parseItemTypes(query?.itemTypes),
      sourceIds: parseCsv(query?.sourceIds),
      categoryIds: parseCsv(query?.categoryIds),
      streamIds: parseCsv(query?.streamIds),
    };
  }

  private resolveExportBaseUrl(req: any, tenantSlug: string | null): string | null {
    const hostCandidates: Array<{ host: string; proto: 'http' | 'https' }> = [];

    const forwardedHost = normalizeHost(req?.headers?.['x-forwarded-host']);
    const forwardedProto = normalizeProto(req?.headers?.['x-forwarded-proto']);
    if (forwardedHost) hostCandidates.push({ host: forwardedHost, proto: forwardedProto });

    const directHost = normalizeHost(req?.headers?.host);
    const directProto = normalizeProto(req?.protocol);
    if (directHost) hostCandidates.push({ host: directHost, proto: directProto });

    const origin = String(req?.headers?.origin || '').trim();
    if (origin) {
      try {
        const parsed = new URL(origin);
        hostCandidates.push({
          host: normalizeHost(parsed.host),
          proto: normalizeProto(parsed.protocol.replace(':', '')),
        });
      } catch {
        // ignore invalid origin
      }
    }

    const referer = String(req?.headers?.referer || '').trim();
    if (referer) {
      try {
        const parsed = new URL(referer);
        hostCandidates.push({
          host: normalizeHost(parsed.host),
          proto: normalizeProto(parsed.protocol.replace(':', '')),
        });
      } catch {
        // ignore invalid referer
      }
    }

    const configuredCandidates = [
      process.env.APP_BASE_URL,
      process.env.PUBLIC_APP_URL,
      process.env.APP_URL,
    ];
    for (const candidate of configuredCandidates) {
      const value = String(candidate || '').trim();
      if (!value) continue;
      try {
        const parsed = new URL(value);
        hostCandidates.push({
          host: normalizeHost(parsed.host),
          proto: normalizeProto(parsed.protocol.replace(':', '')),
        });
      } catch {
        // ignore malformed configured URL
      }
    }

    if (tenantSlug) {
      for (const candidate of hostCandidates) {
        const resolved = this.toTenantHost(candidate.host, tenantSlug, candidate.proto);
        if (resolved) return resolved;
      }

      // Last-resort canonical fallback based on environment.
      const env = String(process.env.APP_ENV || process.env.NODE_ENV || '')
        .trim()
        .toLowerCase();
      if (env === 'production' || env === 'prod') {
        return `https://${tenantSlug}.kanap.net`;
      }
      if (env === 'qa') {
        return `https://${tenantSlug}.qa.kanap.net`;
      }
      return `https://${tenantSlug}.dev.kanap.net`;
    }

    const configured = String(process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    if (configured) return configured.replace(/\/$/, '');
    try {
      return resolveAppBaseUrl(req).replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  private toTenantHost(host: string, tenantSlug: string, proto: 'http' | 'https'): string | null {
    const normalizedHost = normalizeHost(host);
    if (!normalizedHost) return null;
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') return null;

    if (
      normalizedHost === 'lvh.me' ||
      normalizedHost === 'www.lvh.me' ||
      normalizedHost.endsWith('.lvh.me')
    ) {
      return `${proto}://${tenantSlug}.lvh.me`;
    }

    if (
      normalizedHost === 'dev.kanap.net' ||
      normalizedHost === 'www.dev.kanap.net' ||
      normalizedHost.endsWith('.dev.kanap.net')
    ) {
      return `${proto}://${tenantSlug}.dev.kanap.net`;
    }

    if (
      normalizedHost === 'qa.kanap.net' ||
      normalizedHost === 'www.qa.kanap.net' ||
      normalizedHost.endsWith('.qa.kanap.net')
    ) {
      return `${proto}://${tenantSlug}.qa.kanap.net`;
    }

    if (normalizedHost === 'kanap.net' || normalizedHost === 'www.kanap.net' || normalizedHost.endsWith('.kanap.net')) {
      return `${proto}://${tenantSlug}.kanap.net`;
    }

    if (normalizedHost.startsWith('app.')) {
      return `${proto}://${tenantSlug}.${normalizedHost.slice(4)}`;
    }

    if (normalizedHost.startsWith(`${tenantSlug}.`)) {
      return `${proto}://${normalizedHost}`;
    }

    return null;
  }
}
