import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { ContractsService } from './contracts.service';

@UseGuards(JwtAuthGuard)
@Controller('capex-items/:id/contracts')
export class CapexItemContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'reader')
  list(@Param('id') capexItemId: string, @Req() req: any) {
    return this.svc.listContractsForCapexItem(capexItemId, { manager: req?.queryRunner?.manager });
  }

  @Post('bulk-replace')
  @UseGuards(PermissionGuard)
  @RequireLevel('capex', 'member')
  bulkReplace(@Param('id') capexItemId: string, @Body() body: { contract_ids: string[] }, @Req() req: any) {
    return this.svc.bulkReplaceContractsForCapexItem(capexItemId, body?.contract_ids ?? [], { manager: req?.queryRunner?.manager });
  }
}

