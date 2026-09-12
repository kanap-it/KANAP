import { Controller, Get, Patch, Delete, Query, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { AllocationRulesService } from './allocation-rules.service';

@UseGuards(JwtAuthGuard)
@Controller('allocation-rules')
export class AllocationRulesController {
  constructor(private readonly svc: AllocationRulesService) {}

  @Get('active')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'reader')
  async getActive(@Query('year') yearRaw: string, @Req() req: any) {
    return this.svc.resolve(req?.tenant?.id ?? null, Number(yearRaw), {
      manager: req?.queryRunner?.manager,
    });
  }

  @Patch('active')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'admin')
  async setActive(@Query('year') yearRaw: string, @Body() body: any, @Req() req: any) {
    return this.svc.setTenantMethod(
      req?.tenant?.id ?? null,
      Number(yearRaw),
      body?.method,
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager },
    );
  }

  @Delete('active')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'admin')
  async clearActive(@Query('year') yearRaw: string, @Req() req: any) {
    return this.svc.clearTenantMethod(
      req?.tenant?.id ?? null,
      Number(yearRaw),
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager },
    );
  }
}
