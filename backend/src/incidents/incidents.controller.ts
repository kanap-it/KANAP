import { Body, Controller, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { EntityManager } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { attachmentMulterOptions, csvImportMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { RATE_LIMITS } from '../common/rate-limit';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { StorageService } from '../common/storage/storage.service';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { resolveToUuid } from '../common/resolve-item-id';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  IncidentEntriesService,
  IncidentRelationsService,
  IncidentReportService,
  IncidentsAttachmentsService,
  IncidentsService,
} from './services';
import { IncidentsCsvService } from './incidents-csv.service';
import {
  CreateEntryInput,
  CreateIncidentInput,
  IncidentReasonInput,
  ListIncidentsQueryInput,
  UpdateIncidentInput,
  parseIncidentReason,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(
    private readonly svc: IncidentsService,
    private readonly entries: IncidentEntriesService,
    private readonly relations: IncidentRelationsService,
    private readonly attachments: IncidentsAttachmentsService,
    private readonly csvSvc: IncidentsCsvService,
    private readonly report: IncidentReportService,
    private readonly storage: StorageService,
    private readonly knowledge: KnowledgeService,
  ) {}

  private resolveId(id: string, manager: EntityManager): Promise<string> {
    return resolveToUuid(id, 'incident', manager);
  }

  private opts(ctx: TenantRequest) {
    return { manager: ctx.manager, tenantId: ctx.tenantId };
  }

  // Static routes first: list, ids, filter-values, attachment download/delete

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get()
  list(@Query() query: ListIncidentsQueryInput, @Tenant() ctx: TenantRequest) {
    return this.svc.list(query, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get('ids')
  listIds(@Query() query: ListIncidentsQueryInput, @Tenant() ctx: TenantRequest) {
    return this.svc.listIds(query, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get('filter-values')
  listFilterValues(@Query() query: any, @Tenant() ctx: TenantRequest) {
    return this.svc.listFilterValues(query, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const meta = await this.attachments.downloadAttachment(attachmentId, this.opts(ctx));
    const obj = await this.storage.getObjectStream(meta.storage_path);
    res.setHeader('Content-Type', obj.contentType || meta.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', contentDisposition(meta.original_filename));
    if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
    obj.stream.pipe(res);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Patch('attachments/:attachmentId/delete')
  deleteAttachment(@Param('attachmentId') attachmentId: string, @Tenant() ctx: TenantRequest) {
    return this.attachments.deleteAttachment(attachmentId, ctx.userId || null, this.opts(ctx));
  }

  // CSV

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get('export')
  async exportCsv(
    @Query('scope') scope: 'template' | 'data' = 'data',
    @Query('fields') fields: string | undefined,
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const result = await this.csvSvc.export({
      manager: ctx.manager as EntityManager,
      tenantId: ctx.tenantId,
      scope,
      fields: fields ? fields.split(',').map((f) => f.trim()) : undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    if (result.warnings.length > 0) {
      res.setHeader('X-CSV-Warnings', JSON.stringify(result.warnings));
    }
    res.send(result.content);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string = 'true',
    @Query('mode') mode: 'replace' | 'enrich' = 'enrich',
    @Query('operation') operation: 'upsert' | 'update_only' | 'insert_only' = 'upsert',
    @Tenant() ctx: TenantRequest,
  ) {
    return this.csvSvc.import(
      file,
      { dryRun: dryRun !== 'false', mode, operation },
      { manager: ctx.manager as EntityManager, tenantId: ctx.tenantId, userId: ctx.userId || null },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get('csv-fields')
  getCsvFields() {
    return this.csvSvc.getFieldInfo();
  }

  // PDF fiche (read — works on closed/cancelled records)

  @UseGuards(PermissionGuard, RateLimitGuard)
  @RequireLevel('incidents', 'reader')
  @Throttle({ default: RATE_LIMITS.documentExport })
  @Get(':id/report')
  async exportReport(
    @Param('id') idOrRef: string,
    @Query('lang') lang: string | undefined,
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    const result = await this.report.exportPdf(id, lang, {
      manager: ctx.manager,
      tenantId: ctx.tenantId,
      userId: ctx.userId || null,
    });
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    res.send(result.buffer);
  }

  // Journal

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id/entries')
  async listEntries(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.entries.list(id, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Post(':id/entries')
  async createEntry(@Param('id') idOrRef: string, @Body() body: CreateEntryInput, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.entries.createNote(id, body, ctx.userId || null, this.opts(ctx));
  }

  // Linked assets / applications

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id/assets')
  async listAssets(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.relations.listAssets(id, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Post(':id/assets/bulk-replace')
  async bulkReplaceAssets(
    @Param('id') idOrRef: string,
    @Body() body: { asset_ids?: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.relations.bulkReplaceAssets(id, body?.asset_ids ?? [], ctx.userId || null, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id/applications')
  async listApplications(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.relations.listApplications(id, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Post(':id/applications/bulk-replace')
  async bulkReplaceApplications(
    @Param('id') idOrRef: string,
    @Body() body: { application_ids?: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.relations.bulkReplaceApplications(id, body?.application_ids ?? [], ctx.userId || null, this.opts(ctx));
  }

  // Documents (knowledge relations live on the knowledge side)

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id/knowledge')
  async listDocuments(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.knowledge.listDocumentsForEntity('incidents', id, { manager: ctx.manager, userId: ctx.userId || null });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id/knowledge-context')
  async getKnowledgeContext(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.knowledge.getKnowledgeContextForEntity('incidents', id, { manager: ctx.manager, userId: ctx.userId || null });
  }

  // Attachments

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id/attachments')
  async listAttachments(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.attachments.listAttachments(id, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  async uploadAttachment(
    @Param('id') idOrRef: string,
    @UploadedFile() file: Express.Multer.File,
    @Tenant() ctx: TenantRequest,
  ) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.attachments.uploadAttachment(id, file, ctx.userId || null, this.opts(ctx));
  }

  // Lifecycle (admin)

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'admin')
  @Post(':id/reopen')
  async reopen(@Param('id') idOrRef: string, @Body() body: IncidentReasonInput, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    const { reason } = parseIncidentReason(body);
    return this.svc.reopen(id, reason, ctx.userId || null, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'admin')
  @Post(':id/cancel')
  async cancel(@Param('id') idOrRef: string, @Body() body: IncidentReasonInput, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    const { reason } = parseIncidentReason(body);
    return this.svc.cancel(id, reason, ctx.userId || null, this.opts(ctx));
  }

  // CRUD

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'reader')
  @Get(':id')
  async get(@Param('id') idOrRef: string, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.svc.get(id, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Post()
  create(@Body() body: CreateIncidentInput, @Tenant() ctx: TenantRequest) {
    return this.svc.create(body, ctx.userId || null, this.opts(ctx));
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('incidents', 'contributor')
  @Patch(':id')
  async update(@Param('id') idOrRef: string, @Body() body: UpdateIncidentInput, @Tenant() ctx: TenantRequest) {
    const id = await this.resolveId(idOrRef, ctx.manager as EntityManager);
    return this.svc.update(id, body, ctx.userId || null, this.opts(ctx));
  }
}
