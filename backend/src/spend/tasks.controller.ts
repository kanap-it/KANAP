import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Public } from '../auth/public.decorator';
import { TasksService } from './tasks.service';
import { TasksDeleteService } from '../tasks/tasks-delete.service';
import { TasksUnifiedService, RelatedType } from '../tasks/tasks-unified.service';
import { TaskActivitiesService, CreateTaskActivityDto } from '../tasks/task-activities.service';
import { TaskAttachmentsService } from '../tasks/task-attachments.service';
import { TaskTimeEntriesService } from '../tasks/task-time-entries.service';
import { TasksCsvService } from '../tasks/tasks-csv.service';
import { StorageService } from '../common/storage/storage.service';
import { resolveToUuid } from '../common/resolve-item-id';
import { attachmentMulterOptions, csvImportMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { ShareItemDto } from '../notifications/dto/share-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly svc: TasksService,
    private readonly deleteSvc: TasksDeleteService,
    private readonly unified: TasksUnifiedService,
    private readonly activitiesSvc: TaskActivitiesService,
    private readonly attachmentsSvc: TaskAttachmentsService,
    private readonly timeEntriesSvc: TaskTimeEntriesService,
    private readonly csvSvc: TasksCsvService,
    private readonly storage: StorageService,
  ) {}

  private resolve(idOrRef: string, req: any): Promise<string> {
    return resolveToUuid(idOrRef, 'task', req.queryRunner.manager);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get()
  async list(@Query() query: any, @Req() req: any) {
    return this.svc.listAllTasks(query, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get('ids')
  async listIds(@Query() query: any, @Req() req: any) {
    return this.svc.listIds(query, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get('filter-values')
  async listFilterValues(@Query() query: any, @Req() req: any) {
    return this.svc.listFilterValues(query, { manager: req?.queryRunner?.manager });
  }

  // ==================== CSV ====================

  /**
   * Get CSV field metadata - must be before :id route
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'admin')
  @Get('csv-fields')
  getCsvFields() {
    return this.csvSvc.getFieldInfo();
  }

  /**
   * Export tasks to CSV
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'admin')
  @Get('export')
  async exportCsv(
    @Query('scope') scope: 'template' | 'data' = 'data',
    @Query('fields') fields: string | undefined,
    @Query('preset') preset: string | undefined,
    @Query('related_object_type') relatedObjectType: string | undefined,
    @Query('related_object_id') relatedObjectId: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const tenantId = req?.tenant?.id ?? '';
    const result = await this.csvSvc.export({
      manager: req?.queryRunner?.manager,
      tenantId,
      scope,
      fields: fields ? fields.split(',').map((f) => f.trim()) : undefined,
      preset,
      relatedObjectType,
      relatedObjectId,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    res.send(result.content);
  }

  /**
   * Import tasks from CSV
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'admin')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string = 'true',
    @Query('mode') mode: 'replace' | 'enrich' = 'enrich',
    @Query('operation') operation: 'upsert' | 'update_only' | 'insert_only' = 'upsert',
    @Req() req: any,
  ) {
    const tenantId = req?.tenant?.id ?? '';
    return this.csvSvc.import(
      file,
      {
        dryRun: dryRun !== 'false',
        mode,
        operation,
      },
      {
        manager: req?.queryRunner?.manager,
        tenantId,
        userId: req.user?.sub,
      },
    );
  }

  // ==================== STANDALONE TASKS ====================

  /**
   * Create a standalone task (not linked to any project, contract, or spend item)
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Post('standalone')
  async createStandalone(@Body() body: any, @Req() req: any) {
    if (!body?.title || !body.title.toString().trim()) {
      const { BadRequestException } = await import('@nestjs/common');
      throw new BadRequestException('title is required');
    }
    return this.unified.createForTarget(
      { type: null, id: null, payload: body },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager, tenantId: req?.tenant?.id },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get(':id')
  async getOne(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    const res = await this.svc.getOne(id, { manager: req?.queryRunner?.manager });
    if (!res) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Task not found');
    }
    return res;
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'admin')
  @Delete('bulk')
  async bulkDelete(@Body() body: { ids: string[] }, @Req() req: any) {
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    return this.deleteSvc.bulkDelete(ids, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Patch(':id/move')
  async move(
    @Param('id') idOrRef: string,
    @Body() body: { related_object_type: 'spend_item' | 'contract'; related_object_id: string },
    @Req() req: any,
  ) {
    const id = await this.resolve(idOrRef, req);
    if (!body?.related_object_type || !body?.related_object_id) {
      const { BadRequestException } = await import('@nestjs/common');
      throw new BadRequestException('related_object_type and related_object_id are required');
    }
    return this.unified.moveTask(
      { id, next: { type: body.related_object_type, id: body.related_object_id } },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Patch(':id')
  async updateTask(@Param('id') idOrRef: string, @Body() body: any, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    const tenantId = req?.tenant?.id ?? '';
    return this.unified.updateById(id, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager, tenantId });
  }

  // ==================== SHARE ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Post(':id/share')
  async share(@Param('id') idOrRef: string, @Body() body: ShareItemDto, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    const tenantId = req?.tenant?.id ?? '';
    return this.unified.share(id, body, tenantId, req.user?.sub ?? '', {
      manager: req?.queryRunner?.manager,
    });
  }

  // ==================== TIME ENTRIES ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get(':id/time-entries/sum')
  async getTimeSum(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    const total = await this.timeEntriesSvc.sumForTask(id, { manager: req?.queryRunner?.manager });
    return { total };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get(':id/time-entries')
  async listTimeEntries(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    return this.timeEntriesSvc.listForTask(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Post(':id/time-entries')
  async createTimeEntry(
    @Param('id') idOrRef: string,
    @Body() body: { user_id?: string; hours: number; notes?: string; logged_at: string; category?: 'it' | 'business' },
    @Req() req: any,
  ) {
    const id = await this.resolve(idOrRef, req);
    const isAdmin = req?.isAdmin === true;
    return this.timeEntriesSvc.create(
      id,
      {
        user_id: body.user_id,
        hours: body.hours,
        notes: body.notes,
        logged_at: new Date(body.logged_at),
        category: body.category,
      },
      req.user?.sub ?? null,
      isAdmin,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Patch(':id/time-entries/:entryId')
  async updateTimeEntry(
    @Param('id') _id: string,
    @Param('entryId') entryId: string,
    @Body() body: { user_id?: string; hours?: number; notes?: string; logged_at?: string; category?: 'it' | 'business' },
    @Req() req: any,
  ) {
    const isAdmin = req?.isAdmin === true;
    return this.timeEntriesSvc.update(
      entryId,
      {
        user_id: body.user_id,
        hours: body.hours,
        notes: body.notes,
        logged_at: body.logged_at ? new Date(body.logged_at) : undefined,
        category: body.category,
      },
      req.user?.sub ?? null,
      isAdmin,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Delete(':id/time-entries/:entryId')
  async deleteTimeEntry(
    @Param('id') _id: string,
    @Param('entryId') entryId: string,
    @Req() req: any,
  ) {
    await this.timeEntriesSvc.delete(entryId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
      isAdmin: req?.isAdmin === true,
    });
    return { success: true };
  }

  // ==================== ACTIVITIES ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get(':id/activities')
  async listActivities(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    return this.activitiesSvc.listForTask(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Post(':id/activities')
  async createActivity(
    @Param('id') idOrRef: string,
    @Body() body: CreateTaskActivityDto,
    @Req() req: any,
  ) {
    const id = await this.resolve(idOrRef, req);
    const tenantId = req?.tenant?.id ?? '';
    return this.activitiesSvc.create(id, body, tenantId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }

  // ==================== ATTACHMENTS ====================

  // Inline view for embedded images
  // No JWT auth required, but tenant ownership is validated via URL parameter
  @Public()
  @Get('attachments/:tenantSlug/:attachmentId/inline')
  async viewAttachmentInline(
    @Param('tenantSlug') tenantSlug: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    // Look up tenant by slug and set app.current_tenant for RLS
    // This validates tenant ownership while satisfying RLS policies
    const dataSource = this.attachmentsSvc['repo'].manager.connection;
    const runner = dataSource.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      // First get tenant ID from slug (tenants table typically has no RLS)
      const tenantRows = await runner.query(
        `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
        [tenantSlug],
      );
      if (!tenantRows.length) {
        await runner.rollbackTransaction();
        res.status(404).send('Tenant not found');
        return;
      }
      const tenantId = tenantRows[0].id;
      // Set the tenant context for RLS (parameterized to prevent SQL injection)
      await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
      // Now query the attachment - RLS will validate it belongs to this tenant
      const rows = await runner.query(
        `SELECT storage_path, mime_type, size FROM task_attachments WHERE id = $1 LIMIT 1`,
        [attachmentId],
      );
      await runner.commitTransaction();
      if (!rows.length) {
        res.status(404).send('Attachment not found');
        return;
      }
      const obj = await this.storage.getObjectStream(rows[0].storage_path);
      res.setHeader('Content-Type', obj.contentType || rows[0].mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', contentDisposition('', 'inline'));
      const contentLength = obj.contentLength ?? rows[0].size ?? null;
      if (contentLength != null) res.setHeader('Content-Length', String(contentLength));
      res.setHeader('Cache-Control', 'public, max-age=300');
      obj.stream.pipe(res);
    } catch (err) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      throw err;
    } finally {
      await runner.release();
    }
  }

  // Download must be before :id to avoid route conflicts
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const meta = await this.attachmentsSvc.getAttachment(attachmentId, { manager: req?.queryRunner?.manager });
    const obj = await this.storage.getObjectStream(meta.storage_path);
    res.setHeader('Content-Type', obj.contentType || meta.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', contentDisposition(meta.original_filename));
    if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
    obj.stream.pipe(res);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Patch('attachments/:attachmentId/delete')
  async deleteAttachmentStatic(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    return this.attachmentsSvc.deleteAttachment(attachmentId, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get(':id/attachments')
  async listAttachments(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolve(idOrRef, req);
    return this.attachmentsSvc.listAttachments(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', attachmentMulterOptions))
  async uploadAttachment(
    @Param('id') idOrRef: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const id = await this.resolve(idOrRef, req);
    return this.attachmentsSvc.uploadAttachment(id, file, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }
}
