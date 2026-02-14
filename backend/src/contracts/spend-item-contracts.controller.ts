import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { ContractsService } from './contracts.service';

@UseGuards(JwtAuthGuard)
@Controller('spend-items/:id/contracts')
export class SpendItemContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'reader')
  list(@Param('id') spendItemId: string, @Req() req: any) { return this.svc.listContractsForSpendItem(spendItemId, { manager: req?.queryRunner?.manager }); }

  @Post('bulk-replace')
  @UseGuards(PermissionGuard)
  @RequireLevel('opex', 'member')
  bulkReplace(@Param('id') spendItemId: string, @Body() body: { contract_ids: string[] }, @Req() req: any) {
    return this.svc.bulkReplaceContractsForSpendItem(spendItemId, body?.contract_ids ?? [], { manager: req?.queryRunner?.manager });
  }
}
