import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common';
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
  async getActive(@Query('year') yearRaw: string) {
    const year = Number(yearRaw);
    return this.svc.getActive(null, year);
  }

  @Patch('active')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'admin')
  async setActive(@Query('year') yearRaw: string, @Body() body: any) {
    const year = Number(yearRaw);
    const method = String(body?.method ?? 'headcount') as any;
    return this.svc.setActive(null, year, method);
  }
}

