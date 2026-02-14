import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { SpendVersionsService } from './spend-versions.service';
import { SpendAmountsService } from './spend-amounts.service';
import { SpendAllocationsService } from './spend-allocations.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SpendVersionsController {
  constructor(
    private readonly versions: SpendVersionsService,
    private readonly amounts: SpendAmountsService,
    private readonly allocations: SpendAllocationsService,
  ) {}

  @Get('spend-items/:id/versions')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'reader')
  listForItem(@Param('id') itemId: string, @Req() req: any) {
    return this.versions.listForItem(itemId, { manager: req?.queryRunner?.manager });
  }

  @Post('spend-items/:id/versions')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'member')
  createForItem(@Param('id') itemId: string, @Body() body: any, @Req() req: any) {
    return this.versions.createForItem(itemId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @Patch('spend-items/:id/versions')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'member')
  updateForItem(@Param('id') itemId: string, @Body() body: any, @Req() req: any) {
    return this.versions.updateForItem(itemId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @Post('spend-versions/:id/amounts/bulk-upsert')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'member')
  upsertAmounts(@Param('id') versionId: string, @Body() body: any, @Req() req: any) {
    return this.amounts.bulkUpsert(versionId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @Post('spend-versions/:id/allocations/bulk-upsert')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'member')
  upsertAllocations(@Param('id') versionId: string, @Body() body: any, @Req() req: any) {
    const items = Array.isArray(body) ? body : body.items;
    return this.allocations.bulkUpsert(versionId, items, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @Get('spend-versions/:id/allocations')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'reader')
  listAllocations(@Param('id') versionId: string, @Req() req: any) {
    return this.allocations.listForVersion(versionId, { manager: req?.queryRunner?.manager });
  }

  @Get('spend-versions/:id/amounts')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'reader')
  listAmounts(@Param('id') versionId: string, @Query('year') year?: string, @Req() req?: any) {
    const y = year ? parseInt(String(year), 10) : undefined;
    return this.amounts.listByYear(versionId, y as any, { manager: req?.queryRunner?.manager });
  }
}
