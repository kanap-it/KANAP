import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { InterfacesService } from './services';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { attachmentMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { StorageService } from '../common/storage/storage.service';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import {
  CreateInterfaceInput,
  UpdateInterfaceInput,
  ListInterfacesQueryInput,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('interfaces')
export class InterfacesController {
  constructor(
    private readonly svc: InterfacesService,
    private readonly storage: StorageService,
  ) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get()
  list(
    @Query() query: ListInterfacesQueryInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.list(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('map')
  getMap(
    @Query() query: ListInterfacesQueryInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.getMap(query, ctx.tenantId, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('by-application/:applicationId')
  listByApplication(
    @Param('applicationId') applicationId: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listByApplication(applicationId, ctx.tenantId, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/connection-links')
  listConnectionLinksForInterface(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listConnectionLinksForInterface(id, ctx.tenantId, query, {
      manager: ctx.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id')
  get(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.get(id, query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/legs')
  listLegs(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listLegs(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post()
  create(
    @Body() body: CreateInterfaceInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.create(body as Record<string, unknown>, ctx.tenantId, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/duplicate')
  duplicate(
    @Param('id') id: string,
    @Body() body: { copyBindings?: boolean },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.duplicate(id, ctx.tenantId, ctx.userId || null, {
      manager: ctx.manager,
      copyBindings: body?.copyBindings === true,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateInterfaceInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.update(id, body as Record<string, unknown>, ctx.tenantId, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch(':id/legs')
  updateLegs(
    @Param('id') id: string,
    @Body() body: { legs: Array<Record<string, unknown>> },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.updateLegs(id, body, ctx.tenantId, ctx.userId || null, {
      manager: ctx.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Delete('bulk')
  bulkDelete(
    @Body() body: { ids: string[]; deleteRelatedBindings?: boolean },
    @Tenant() ctx: TenantRequest,
  ) {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    return this.svc.bulkDelete(ids, ctx.userId || null, {
      manager: ctx.manager,
      deleteRelatedBindings: body?.deleteRelatedBindings === true,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Body() body: { deleteRelatedBindings?: boolean },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.delete(id, ctx.userId || null, {
      manager: ctx.manager,
      deleteRelatedBindings: body?.deleteRelatedBindings === true,
    });
  }

  // Owners
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/owners')
  listOwners(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listOwners(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/owners/bulk-replace')
  bulkReplaceOwners(
    @Param('id') id: string,
    @Body() body: { owners: Array<{ user_id: string; owner_type: 'business' | 'it' }> },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.bulkReplaceOwners(id, body?.owners ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Companies
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/companies')
  listCompanies(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listCompanies(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/companies/bulk-replace')
  bulkReplaceCompanies(
    @Param('id') id: string,
    @Body() body: { company_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.bulkReplaceCompanies(id, body?.company_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Dependencies
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/dependencies')
  listDependencies(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listDependencies(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/dependencies/bulk-replace')
  bulkReplaceDependencies(
    @Param('id') id: string,
    @Body() body: { upstream_ids?: string[]; downstream_ids?: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.bulkReplaceDependencies(
      id,
      body?.upstream_ids ?? [],
      body?.downstream_ids ?? [],
      ctx.userId || null,
      { manager: ctx.manager },
    );
  }

  // Key identifiers
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/key-identifiers')
  listKeyIdentifiers(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listKeyIdentifiers(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/key-identifiers/bulk-replace')
  bulkReplaceKeyIdentifiers(
    @Param('id') id: string,
    @Body()
    body: { items: Array<{ source_identifier: string; destination_identifier: string; identifier_notes?: string | null }> },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.bulkReplaceKeyIdentifiers(id, body?.items ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Data residency
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/data-residency')
  listDataResidency(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listDataResidency(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/data-residency/bulk-replace')
  bulkReplaceDataResidency(
    @Param('id') id: string,
    @Body() body: { countries: string[] },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.bulkReplaceDataResidency(id, body?.countries ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Links
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/links')
  listLinks(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listLinks(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/links')
  createLink(
    @Param('id') id: string,
    @Body() body: { description?: string; url: string },
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.createLink(id, body, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
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
  @RequireLevel('applications', 'member')
  @Delete(':id/links/:linkId')
  deleteLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.deleteLink(id, linkId, ctx.userId || null, { manager: ctx.manager });
  }

  // Attachments for interface id
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/attachments')
  listAttachments(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.listAttachments(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.uploadAttachment(id, file, body, ctx.userId || null, {
      manager: ctx.manager,
    });
  }

  // Attachments: static segment before :id for download
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
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
  @RequireLevel('applications', 'member')
  @Patch('attachments/:attachmentId/delete')
  deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.svc.deleteAttachment(attachmentId, ctx.userId || null, {
      manager: ctx.manager,
    });
  }
}
