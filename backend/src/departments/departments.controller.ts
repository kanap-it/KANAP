import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsDeleteService } from './departments-delete.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { csvImportMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { DepartmentUpsertDto } from './dto/department.dto';
import { Tenant, TenantRequest } from '../common/decorators';

@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly svc: DepartmentsService,
    private readonly deleteSvc: DepartmentsDeleteService,
  ) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'reader')
  @Get()
  list(@Query() query: any, @Tenant() ctx: TenantRequest) { return this.svc.list(query, { manager: ctx.manager }); }

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'reader')
  @Get('ids')
  listIds(@Query() query: any, @Tenant() ctx: TenantRequest) {
    return this.svc.listIds(query, { manager: ctx.manager });
  }

  // Export route before :id to avoid collisions
  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'admin')
  @Get('export')
  async export(@Query('scope') scope: 'template' | 'data' = 'data', @Res() res: Response, @Tenant() ctx: TenantRequest) {
    const { filename, content } = await this.svc.exportCsv(scope, { manager: ctx.manager });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(filename));
    res.send(content);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'reader')
  @Get(':id')
  get(@Param('id') id: string, @Tenant() ctx: TenantRequest) { return this.svc.get(id, { manager: ctx.manager }); }

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'member')
  @Post()
  create(@Body() body: DepartmentUpsertDto, @Tenant() ctx: TenantRequest) { return this.svc.create(body, ctx.userId || null, { manager: ctx.manager }); }

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'member')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: DepartmentUpsertDto, @Tenant() ctx: TenantRequest) { return this.svc.update(id, body, ctx.userId || null, { manager: ctx.manager }); }

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'admin')
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
  @RequireLevel('departments', 'admin')
  @Delete('bulk')
  bulkDelete(@Body() body: { ids: string[] }, @Tenant() ctx: TenantRequest) {
    return this.deleteSvc.bulkDelete(body.ids, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('departments', 'admin')
  @Delete(':id')
  delete(@Param('id') id: string, @Tenant() ctx: TenantRequest) {
    return this.deleteSvc.delete(id, { manager: ctx.manager, userId: ctx.userId || null });
  }
}
