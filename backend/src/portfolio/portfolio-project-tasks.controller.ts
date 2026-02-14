import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { TasksUnifiedService } from '../tasks/tasks-unified.service';
import { TaskTimeEntriesService } from '../tasks/task-time-entries.service';
import { TaskActivitiesService, CreateTaskActivityDto } from '../tasks/task-activities.service';
import { Task } from '../tasks/task.entity';
import { TaskTimeEntryCategory } from '../tasks/task-time-entry.entity';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/projects/:projectId/tasks')
export class PortfolioProjectTasksController {
  constructor(
    private readonly tasksSvc: TasksUnifiedService,
    private readonly timeEntriesSvc: TaskTimeEntriesService,
    private readonly activitiesSvc: TaskActivitiesService,
  ) {}

  // ==================== TASKS ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get()
  listTasks(@Param('projectId') projectId: string, @Req() req: any) {
    return this.tasksSvc.listForTarget(
      { type: 'project', id: projectId },
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post()
  createTask(
    @Param('projectId') projectId: string,
    @Body() body: Partial<Task>,
    @Req() req: any,
  ) {
    return this.tasksSvc.createForTarget(
      { type: 'project', id: projectId, payload: body },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager },
    );
  }

  // ==================== PROJECT TIME SUMMARY ====================
  // NOTE: Must be defined before :taskId routes to avoid being captured as taskId

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get('time-summary')
  async getProjectTimeSummary(@Param('projectId') projectId: string, @Req() req: any) {
    const byCategory = await this.timeEntriesSvc.sumForProjectByCategory(projectId, { manager: req?.queryRunner?.manager });
    return {
      it_hours: byCategory.it,
      business_hours: byCategory.business,
      total_hours: byCategory.it + byCategory.business,
    };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get('time-entries')
  async getProjectTaskTimeEntries(@Param('projectId') projectId: string, @Req() req: any) {
    return this.timeEntriesSvc.listForProject(projectId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Patch(':taskId')
  updateTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: Partial<Task>,
    @Req() req: any,
  ) {
    const tenantId = req?.tenant?.id ?? '';
    return this.tasksSvc.updateForTarget(
      { type: 'project', id: projectId, payload: { ...body, id: taskId } },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager, tenantId },
    );
  }

  // ==================== TIME ENTRIES ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':taskId/time-entries')
  listTimeEntries(@Param('taskId') taskId: string, @Req() req: any) {
    return this.timeEntriesSvc.listForTask(taskId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post(':taskId/time-entries')
  createTimeEntry(
    @Param('taskId') taskId: string,
    @Body() body: { user_id?: string; hours: number; notes?: string; logged_at: string; category?: TaskTimeEntryCategory },
    @Req() req: any,
  ) {
    return this.timeEntriesSvc.create(
      taskId,
      {
        user_id: body.user_id,
        hours: body.hours,
        notes: body.notes,
        logged_at: new Date(body.logged_at),
        category: body.category,
      },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Patch(':taskId/time-entries/:entryId')
  async updateTimeEntry(
    @Param('taskId') taskId: string,
    @Param('entryId') entryId: string,
    @Body() body: { user_id?: string; hours?: number; notes?: string; logged_at?: string; category?: TaskTimeEntryCategory },
    @Req() req: any,
  ) {
    // Verify entry belongs to task
    const entryTaskId = await this.timeEntriesSvc.getTaskIdForEntry(entryId, { manager: req?.queryRunner?.manager });
    if (entryTaskId !== taskId) {
      throw new Error('Time entry does not belong to this task');
    }

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
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Delete(':taskId/time-entries/:entryId')
  async deleteTimeEntry(
    @Param('taskId') taskId: string,
    @Param('entryId') entryId: string,
    @Req() req: any,
  ) {
    // Verify entry belongs to task
    const entryTaskId = await this.timeEntriesSvc.getTaskIdForEntry(entryId, { manager: req?.queryRunner?.manager });
    if (entryTaskId !== taskId) {
      throw new Error('Time entry does not belong to this task');
    }

    await this.timeEntriesSvc.delete(entryId, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
    return { success: true };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':taskId/time-entries/sum')
  async getTimeSum(@Param('taskId') taskId: string, @Req() req: any) {
    const total = await this.timeEntriesSvc.sumForTask(taskId, { manager: req?.queryRunner?.manager });
    return { total };
  }

  // ==================== ACTIVITIES ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':taskId/activities')
  listActivities(@Param('taskId') taskId: string, @Req() req: any) {
    return this.activitiesSvc.listForTask(taskId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post(':taskId/activities')
  createActivity(
    @Param('taskId') taskId: string,
    @Body() body: CreateTaskActivityDto,
    @Req() req: any,
  ) {
    const tenantId = req?.tenant?.id ?? '';
    return this.activitiesSvc.create(taskId, body, tenantId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Patch(':taskId/activities/:activityId')
  updateActivity(
    @Param('taskId') taskId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new Error('User ID required');
    }
    return this.activitiesSvc.updateComment(taskId, activityId, body?.content ?? '', userId, {
      manager: req?.queryRunner?.manager,
    });
  }
}
