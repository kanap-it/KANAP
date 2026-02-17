import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { SpendTasksService } from './spend-tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('spend-items/:id/tasks')
export class SpendTasksController {
  constructor(private readonly svc: SpendTasksService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get()
  list(@Param('id') itemId: string, @Req() req: any) { return this.svc.listForItem(itemId, { manager: req?.queryRunner?.manager }); }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Post()
  create(@Param('id') itemId: string, @Body() body: any, @Req() req: any) {
    return this.svc.createForItem(itemId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager, tenantId: req?.tenant?.id });
  }

  // PATCH expects body.id of the task to update
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Patch()
  update(@Param('id') itemId: string, @Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.updateForItem(itemId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager, tenantId });
  }
}
