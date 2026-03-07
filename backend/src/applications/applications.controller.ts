import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { ApplicationsService } from './services';
import { ApplicationsDeleteService } from './applications-delete.service';
import { ApplicationsCsvService } from './applications-csv.service';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { attachmentMulterOptions, csvImportMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { StorageService } from '../common/storage/storage.service';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  CreateApplicationInput,
  UpdateApplicationInput,
  ListApplicationsQueryInput,
  ApplicationListItemResponse,
  ApplicationMapSummaryResponse,
  VersionLineageResponse,
  BulkOperationResponse,
  TotalUsersResponse,
  ApplicationsBulkDeleteResult,
  ApplicationWithServerAssignments,
  CsvImportResult,
} from './dto';
import { Application } from './application.entity';
import { ApplicationOwner } from './application-owner.entity';
import { ApplicationCompany } from './application-company.entity';
import { ApplicationDepartment } from './application-department.entity';
import { ApplicationLink } from './application-link.entity';
import { ApplicationAttachment } from './application-attachment.entity';
import { ApplicationDataResidency } from './application-data-residency.entity';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly svc: ApplicationsService,
    private readonly storage: StorageService,
    private readonly deleteSvc: ApplicationsDeleteService,
    private readonly csvSvc: ApplicationsCsvService,
    private readonly knowledge: KnowledgeService,
  ) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get()
  list(
    @Query() query: ListApplicationsQueryInput,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: ApplicationListItemResponse[]; total: number; page: number; limit: number }> {
    return this.svc.list(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('ids')
  listIds(
    @Query() query: ListApplicationsQueryInput,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ ids: string[] }> {
    return this.svc.listIds(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('filter-values')
  listFilterValues(
    @Query() query: any,
    @Tenant() ctx: TenantRequest,
  ): Promise<Record<string, Array<string | boolean | null>>> {
    return this.svc.listFilterValues(query, { manager: ctx.manager });
  }

  // Export before :id - uses V2 CSV service
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Get('export')
  async export(
    @Query('scope') scope: 'template' | 'data' = 'data',
    @Query('fields') fields: string | undefined,
    @Query('preset') preset: string | undefined,
    @Query('lifecycle') lifecycle: string | undefined,
    @Query('criticality') criticality: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const result = await this.csvSvc.export({
      manager: ctx.manager,
      tenantId: ctx.tenantId,
      scope,
      fields: fields ? fields.split(',').map((f) => f.trim()) : undefined,
      preset,
      lifecycle,
      criticality,
      status,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    res.send(result.content);
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
  ): Promise<{ ok: boolean }> {
    return this.svc.deleteAttachment(attachmentId, ctx.userId || null, { manager: ctx.manager });
  }

  // Bulk delete before parameterized ':id'
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Delete('bulk')
  bulkDelete(
    @Body() body: { ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationsBulkDeleteResult> {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    return this.deleteSvc.bulkDelete(ids, ctx.userId || null, { manager: ctx.manager });
  }

  // Applications with server assignments (for Connection Map filtering)
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('with-server-assignments')
  listWithServerAssignments(
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: ApplicationWithServerAssignments[] }> {
    return this.svc.listWithServerAssignments({ manager: ctx.manager });
  }

  // ==================== CSV V2 Endpoints ====================
  // Must be before :id route to avoid route conflicts

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Get('csv-fields')
  getCsvFields() {
    return this.csvSvc.getFieldInfo();
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Get('export/v2')
  async exportCsvV2(
    @Query('scope') scope: 'template' | 'data' = 'data',
    @Query('fields') fields: string | undefined,
    @Query('preset') preset: string | undefined,
    @Query('lifecycle') lifecycle: string | undefined,
    @Query('criticality') criticality: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    const result = await this.csvSvc.export({
      manager: ctx.manager,
      tenantId: ctx.tenantId,
      scope,
      fields: fields ? fields.split(',').map((f) => f.trim()) : undefined,
      preset,
      lifecycle,
      criticality,
      status,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    res.send(result.content);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Post('import/v2')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  async importCsvV2(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string = 'true',
    @Query('mode') mode: 'replace' | 'enrich' = 'enrich',
    @Query('operation') operation: 'upsert' | 'update_only' | 'insert_only' = 'upsert',
    @Tenant() ctx: TenantRequest,
  ) {
    return this.csvSvc.import(
      file,
      {
        dryRun: dryRun !== 'false',
        mode,
        operation,
      },
      {
        manager: ctx.manager,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id')
  get(
    @Param('id') id: string,
    @Query('include') include: string | string[],
    @Tenant() ctx: TenantRequest,
  ): Promise<Record<string, unknown>> {
    return this.svc.get(id, { manager: ctx.manager, include });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/knowledge')
  listDocuments(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
    @Req() req: any,
  ) {
    return this.knowledge.listDocumentsForEntity('applications', id, {
      manager: ctx.manager,
      userId: req?.user?.sub ?? null,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post()
  create(
    @Body() body: CreateApplicationInput,
    @Tenant() ctx: TenantRequest,
  ): Promise<Application> {
    // The service handles date conversion from strings
    return this.svc.create(body as Record<string, unknown>, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateApplicationInput,
    @Tenant() ctx: TenantRequest,
  ): Promise<Application> {
    // The service handles date conversion from strings
    return this.svc.update(id, body as Record<string, unknown>, ctx.userId || null, { manager: ctx.manager });
  }

  // Import - uses V2 CSV service
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'admin')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string = 'true',
    @Query('mode') mode: 'replace' | 'enrich' = 'enrich',
    @Query('operation') operation: 'upsert' | 'update_only' | 'insert_only' = 'upsert',
    @Tenant() ctx: TenantRequest,
  ) {
    return this.csvSvc.import(
      file,
      {
        dryRun: dryRun !== 'false',
        mode,
        operation,
      },
      {
        manager: ctx.manager,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<void> {
    return this.deleteSvc.delete(id, { manager: ctx.manager, userId: ctx.userId || null });
  }

  // Owners
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/owners')
  listOwners(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationOwner[]> {
    return this.svc.listOwners(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/owners/bulk-replace')
  bulkReplaceOwners(
    @Param('id') id: string,
    @Body() body: { owners: Array<{ user_id: string; owner_type: 'business' | 'it' }> },
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationOwner[]> {
    return this.svc.bulkReplaceOwners(id, body?.owners ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Audience: companies & departments
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/companies')
  listCompanies(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationCompany[]> {
    return this.svc.listCompanies(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/companies/bulk-replace')
  bulkReplaceCompanies(
    @Param('id') id: string,
    @Body() body: { company_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationCompany[]> {
    return this.svc.bulkReplaceCompanies(id, body?.company_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/departments')
  listDepartments(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationDepartment[]> {
    return this.svc.listDepartments(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/departments/bulk-replace')
  bulkReplaceDepartments(
    @Param('id') id: string,
    @Body() body: { department_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationDepartment[]> {
    return this.svc.bulkReplaceDepartments(id, body?.department_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Map-side summaries
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/map-summary')
  mapSummary(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationMapSummaryResponse> {
    return this.svc.mapSummary(id, { manager: ctx.manager });
  }

  // Support contacts
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/support-contacts')
  listSupportContacts(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<Array<{ id: string; contact_id: string; role: string | null; contact: Record<string, unknown> }>> {
    return this.svc.listSupportContacts(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/support-contacts/bulk-replace')
  bulkReplaceSupportContacts(
    @Param('id') id: string,
    @Body() body: { contacts: Array<{ contact_id: string; role?: string | null }> },
    @Tenant() ctx: TenantRequest,
  ): Promise<Array<{ id: string; contact_id: string; role: string | null; contact: Record<string, unknown> }>> {
    return this.svc.bulkReplaceSupportContacts(id, body?.contacts ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Links
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/links')
  listLinks(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationLink[]> {
    return this.svc.listLinks(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/links')
  createLink(
    @Param('id') id: string,
    @Body() body: { description?: string; url: string },
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationLink> {
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
  ): Promise<ApplicationLink> {
    return this.svc.updateLink(id, linkId, body, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete(':id/links/:linkId')
  deleteLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ ok: boolean }> {
    return this.svc.deleteLink(id, linkId, ctx.userId || null, { manager: ctx.manager });
  }

  // Attachments for app id
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/attachments')
  listAttachments(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationAttachment[]> {
    return this.svc.listAttachments(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationAttachment> {
    return this.svc.uploadAttachment(id, file, ctx.userId || null, { manager: ctx.manager });
  }

  // Data residency
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/data-residency')
  listDataResidency(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationDataResidency[]> {
    return this.svc.listDataResidency(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/data-residency/bulk-replace')
  bulkReplaceDataResidency(
    @Param('id') id: string,
    @Body() body: { countries: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<ApplicationDataResidency[]> {
    return this.svc.bulkReplaceDataResidency(id, body?.countries ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Relations — OPEX (spend items)
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/spend-items')
  listLinkedSpend(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; name: string }> }> {
    return this.svc.listLinkedSpendItems(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/spend-items/bulk-replace')
  bulkReplaceLinkedSpend(
    @Param('id') id: string,
    @Body() body: { spend_item_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<BulkOperationResponse> {
    return this.svc.bulkReplaceLinkedSpendItems(id, body?.spend_item_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Relations — CAPEX items
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/capex-items')
  listLinkedCapex(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; description: string }> }> {
    return this.svc.listLinkedCapexItems(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/capex-items/bulk-replace')
  bulkReplaceLinkedCapex(
    @Param('id') id: string,
    @Body() body: { capex_item_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<BulkOperationResponse> {
    return this.svc.bulkReplaceLinkedCapexItems(id, body?.capex_item_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Relations — Contracts
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/contracts')
  listLinkedContracts(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; name: string }> }> {
    return this.svc.listLinkedContracts(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/contracts/bulk-replace')
  bulkReplaceLinkedContracts(
    @Param('id') id: string,
    @Body() body: { contract_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<BulkOperationResponse> {
    return this.svc.bulkReplaceLinkedContracts(id, body?.contract_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Relations — Projects
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/projects')
  listProjects(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; name: string }> }> {
    return this.svc.listProjects(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/projects/bulk-replace')
  bulkReplaceProjects(
    @Param('id') id: string,
    @Body() body: { project_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; name: string }> }> {
    return this.svc.bulkReplaceProjects(id, body?.project_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  // Structure — Suites and Components
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/suites')
  listSuites(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; name: string; lifecycle: string; criticality: string }> }> {
    return this.svc.listSuites(id, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/suites/bulk-replace')
  bulkReplaceSuites(
    @Param('id') id: string,
    @Body() body: { suite_ids: string[] },
    @Tenant() ctx: TenantRequest,
  ): Promise<BulkOperationResponse> {
    return this.svc.bulkReplaceSuites(id, body?.suite_ids ?? [], ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/components')
  listComponents(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<{ items: Array<{ id: string; name: string; lifecycle: string; criticality: string }> }> {
    return this.svc.listComponents(id, { manager: ctx.manager });
  }

  // Derived total users helper (read-only)
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/total-users')
  totalUsers(
    @Param('id') id: string,
    @Query('year') yearRaw: string | undefined,
    @Tenant() ctx: TenantRequest,
  ): Promise<TotalUsersResponse> {
    const y = yearRaw ? parseInt(String(yearRaw), 10) : undefined;
    return this.svc.getTotalUsers(id, y, { manager: ctx.manager });
  }

  // ==================== VERSION MANAGEMENT ====================

  /**
   * Create a new version of an application with lineage tracking.
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post(':id/create-version')
  createVersion(
    @Param('id') id: string,
    @Body() body: {
      name: string;
      version?: string;
      go_live_date?: string;
      end_of_support_date?: string;
      copyOwners?: boolean;
      copyCompanies?: boolean;
      copyDepartments?: boolean;
      copyDataResidency?: boolean;
      copyLinks?: boolean;
      copySupportContacts?: boolean;
      copySpendItems?: boolean;
      copyCapexItems?: boolean;
      copyContracts?: boolean;
      copyInstances?: boolean;
      copyBindings?: boolean;
      interfaceIds?: string[];
    },
    @Tenant() ctx: TenantRequest,
  ): Promise<Application> {
    return this.svc.createVersion(id, body, ctx.userId || null, { manager: ctx.manager });
  }

  /**
   * Get version lineage (predecessors and successors) for an application.
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/version-lineage')
  getVersionLineage(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<VersionLineageResponse> {
    return this.svc.getVersionLineage(id, { manager: ctx.manager });
  }

  /**
   * Get interfaces involving this application, for migration wizard.
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get(':id/interfaces-for-migration')
  getInterfacesForMigration(
    @Param('id') id: string,
    @Tenant() ctx: TenantRequest,
  ): Promise<Array<{ id: string; name: string; direction: string }>> {
    return this.svc.getInterfacesForMigration(id, { manager: ctx.manager });
  }
}
