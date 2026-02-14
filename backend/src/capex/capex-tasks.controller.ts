import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { TasksUnifiedService } from '../tasks/tasks-unified.service';

@UseGuards(JwtAuthGuard)
@Controller('capex-items/:id/tasks')
export class CapexTasksController {
  constructor(private readonly unified: TasksUnifiedService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get()
  list(@Param('id') itemId: string, @Req() req: any) {
    return this.unified.listForTarget({ type: 'capex_item', id: itemId }, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Post()
  create(@Param('id') itemId: string, @Body() body: any, @Req() req: any) {
    return this.unified.createForTarget({ type: 'capex_item', id: itemId, payload: body }, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  // PATCH expects body.id of the task to update
  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'member')
  @Patch()
  update(@Param('id') itemId: string, @Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.unified.updateForTarget({ type: 'capex_item', id: itemId, payload: body }, req.user?.sub ?? null, { manager: req?.queryRunner?.manager, tenantId });
  }
}

