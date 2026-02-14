import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { AdminCoaTemplatesService } from './admin-coa-templates.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { csvImportMulterOptions } from '../../common/upload';
import { contentDisposition } from '../../common/content-disposition';
import { Response } from 'express';

@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/coa-templates')
export class AdminCoaTemplatesController {
  constructor(private readonly svc: AdminCoaTemplatesService) {}

  @Get()
  list(@Query() query: any) { return this.svc.list(query); }

  @Get(':id')
  get(@Param('id') id: string) { return this.svc.get(id); }

  @Post()
  create(@Body() body: { country_iso?: string; template_code?: string; template_name?: string; version?: string; is_global?: boolean; loaded_by_default?: boolean }) { return this.svc.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ country_iso: string | null; template_code: string; template_name: string; version: string; is_global: boolean; loaded_by_default: boolean }>) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }

  @Get(':id/export')
  async export(@Param('id') id: string, @Res() res: Response) {
    const { filename, content } = await this.svc.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(filename));
    res.send(content);
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  import(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRunRaw?: string,
  ) {
    const dryRun = String(dryRunRaw ?? 'true').toLowerCase() !== 'false';
    return this.svc.importCsv(id, file, dryRun);
  }

  // Standard Accounts management within a Template (platform admin scope)
  @Get(':id/accounts')
  listAccounts(@Param('id') id: string, @Query() query: any) {
    return this.svc.listAccounts(id, query);
  }

  @Get(':id/accounts/ids')
  listAccountIds(@Param('id') id: string, @Query() query: any) {
    return this.svc.listAccountIds(id, query);
  }

  @Get(':id/accounts/:accountNumber')
  getAccount(@Param('id') id: string, @Param('accountNumber') accountNumber: string) {
    return this.svc.getAccount(id, accountNumber);
  }

  @Post(':id/accounts')
  createAccount(@Param('id') id: string, @Body() body: any) {
    return this.svc.createAccount(id, body);
  }

  @Patch(':id/accounts/:accountNumber')
  updateAccount(@Param('id') id: string, @Param('accountNumber') accountNumber: string, @Body() body: any) {
    return this.svc.updateAccount(id, accountNumber, body);
  }

  @Delete(':id/accounts/bulk')
  bulkDeleteAccounts(@Param('id') id: string, @Body() body: { ids: string[] }) {
    return this.svc.bulkDeleteAccounts(id, body?.ids || []);
  }

  @Delete(':id/accounts/:accountNumber')
  deleteAccount(@Param('id') id: string, @Param('accountNumber') accountNumber: string) {
    return this.svc.deleteAccount(id, accountNumber);
  }
}
