import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CapexItemsService } from './capex-items.service';
import { CapexItemsDeleteService } from './capex-items-delete.service';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { attachmentMulterOptions, csvImportMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { StorageService } from '../common/storage/storage.service';
import { CapexItemContactsService } from './capex-item-contacts.service';
import { SupplierContactRole } from '../contacts/supplier-contact.entity';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import {
  CreateCapexItemInput,
  UpdateCapexItemInput,
  ListCapexQueryInput,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('capex-items')
export class CapexItemsController {
  constructor(
    private readonly svc: CapexItemsService,
    private readonly deleteSvc: CapexItemsDeleteService,
    private readonly storage: StorageService,
    private readonly contactsSvc: CapexItemContactsService,
  ) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get()
  list(
    @Query() query: ListCapexQueryInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.list(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get('summary')
  summary(
    @Query() query: ListCapexQueryInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.summary(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get('summary/filter-values')
  summaryFilterValues(
    @Query() query: any,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.summaryFilterValues(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get('summary/ids')
  summaryIds(
    @Query() query: ListCapexQueryInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.summaryIds(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get('summary/totals')
  summaryTotals(
    @Query() query: ListCapexQueryInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.summaryTotals(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'admin')
  @Get('export')
  async export(
    @Query('scope') scope: 'template' | 'data' = 'data',
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const { filename, content } = await this.svc.exportCsv(scope, { manager: ctx.manager });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(filename));
    res.send(content);
  }

  // Links
  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get(':id/links')
  listLinks(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listLinks(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Post(':id/links')
  createLink(
    @Param('id') id: string,
    @Body() body: { description?: string; url: string },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.createLink(id, body, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Patch(':id/links/:linkId')
  updateLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() body: { description?: string; url?: string },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.updateLink(id, linkId, body, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Delete(':id/links/:linkId')
  deleteLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.deleteLink(id, linkId, ctx.userId || null, { manager: ctx.manager });
  }

  // Attachments: downloads use a static segment before :id routing
  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const meta = await this.svc.downloadAttachment(attachmentId, { manager: ctx.manager });
    const obj = await this.storage.getObjectStream(meta.storage_path);
    res.setHeader('Content-Type', obj.contentType || meta.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', contentDisposition(meta.original_filename));
    if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
    obj.stream.pipe(res);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Patch('attachments/:attachmentId/delete')
  deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.deleteAttachment(attachmentId, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get(':id/attachments')
  listAttachments(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listAttachments(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.uploadAttachment(id, file, ctx.userId || null, { manager: ctx.manager });
  }

  // Contacts
  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get(':id/contacts')
  listContacts(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.contactsSvc.listForItem(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Post(':id/contacts')
  attachContact(
    @Param('id') id: string,
    @Body() body: { contactId: string; role: SupplierContactRole },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.contactsSvc.attachManual(id, body, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Delete(':id/contacts/:linkId')
  detachContact(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.contactsSvc.detach(linkId, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Post(':id/contacts/sync-from-supplier')
  syncContactsFromSupplier(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.contactsSvc.syncFromSupplierForItem(id, { manager: ctx.manager });
  }

  // Projects
  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get(':id/projects')
  listProjects(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listProjects(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Post(':id/projects/bulk-replace')
  bulkReplaceProjects(
    @Param('id') id: string,
    @Body() body: { project_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.bulkReplaceProjects(id, body?.project_ids ?? [], { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  @Get(':id')
  get(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.get(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Post()
  create(
    @Body() body: CreateCapexItemInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.create(body as Record<string, unknown>, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateCapexItemInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.update(id, body as Record<string, unknown>, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'admin')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRunRaw: string,
    @Tenant() ctx: TenantRequest,
  ) {
    const dryRun = String(dryRunRaw ?? 'true').toLowerCase() !== 'false';
    return this.svc.importCsv({ file, dryRun, userId: ctx.userId || null }, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'admin')
  @Delete('bulk')
  bulkDelete(
    @Body() body: { ids: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.deleteSvc.bulkDelete(body.ids, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'admin')
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.deleteSvc.delete(id, { manager: ctx.manager, userId: ctx.userId || null });
  }
}
