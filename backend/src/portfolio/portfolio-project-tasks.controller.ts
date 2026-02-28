import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { TasksUnifiedService } from '../tasks/tasks-unified.service';
import { TaskTimeEntriesService } from '../tasks/task-time-entries.service';
import { TaskActivitiesService, ActivityBodyDto } from '../tasks/task-activities.service';
import { Task } from '../tasks/task.entity';
import { TaskTimeEntryCategory } from '../tasks/task-time-entry.entity';
import { resolveToUuid } from '../common/resolve-item-id';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/projects/:projectId/tasks')
export class PortfolioProjectTasksController {
  constructor(
    private readonly tasksSvc: TasksUnifiedService,
    private readonly timeEntriesSvc: TaskTimeEntriesService,
    private readonly activitiesSvc: TaskActivitiesService,
  ) {}

  private resolveProjectId(idOrRef: string, req: any): Promise<string> {
    return resolveToUuid(idOrRef, 'project', req?.queryRunner?.manager);
  }

  private resolveTaskId(idOrRef: string, req: any): Promise<string> {
    return resolveToUuid(idOrRef, 'task', req?.queryRunner?.manager);
  }

  // ==================== TASKS ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get()
  async listTasks(@Param('projectId') projectIdOrRef: string, @Req() req: any) {
    const projectId = await this.resolveProjectId(projectIdOrRef, req);
    return this.tasksSvc.listForTarget(
      { type: 'project', id: projectId },
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post()
  async createTask(
    @Param('projectId') projectIdOrRef: string,
    @Body() body: Partial<Task>,
    @Req() req: any,
  ) {
    const projectId = await this.resolveProjectId(projectIdOrRef, req);
    return this.tasksSvc.createForTarget(
      { type: 'project', id: projectId, payload: body },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager, tenantId: req?.tenant?.id },
    );
  }

  // ==================== PROJECT TIME SUMMARY ====================
  // NOTE: Must be defined before :taskId routes to avoid being captured as taskId

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get('time-summary')
  async getProjectTimeSummary(@Param('projectId') projectIdOrRef: string, @Req() req: any) {
    const projectId = await this.resolveProjectId(projectIdOrRef, req);
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
  async getProjectTaskTimeEntries(@Param('projectId') projectIdOrRef: string, @Req() req: any) {
    const projectId = await this.resolveProjectId(projectIdOrRef, req);
    return this.timeEntriesSvc.listForProject(projectId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Patch(':taskId')
  async updateTask(
    @Param('projectId') projectIdOrRef: string,
    @Param('taskId') taskIdOrRef: string,
    @Body() body: Partial<Task>,
    @Req() req: any,
  ) {
    const projectId = await this.resolveProjectId(projectIdOrRef, req);
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    const tenantId = req?.tenant?.id ?? '';
    return this.tasksSvc.updateById(
      taskId,
      {
        ...body,
        related_object_type: 'project',
        related_object_id: projectId,
      },
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager, tenantId },
    );
  }

  // ==================== TIME ENTRIES ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':taskId/time-entries')
  async listTimeEntries(@Param('taskId') taskIdOrRef: string, @Req() req: any) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    return this.timeEntriesSvc.listForTask(taskId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post(':taskId/time-entries')
  async createTimeEntry(
    @Param('taskId') taskIdOrRef: string,
    @Body() body: { user_id?: string; hours: number; notes?: string; logged_at: string; category?: TaskTimeEntryCategory },
    @Req() req: any,
  ) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    const isAdmin = req?.isAdmin === true;
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
      isAdmin,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Patch(':taskId/time-entries/:entryId')
  async updateTimeEntry(
    @Param('taskId') taskIdOrRef: string,
    @Param('entryId') entryId: string,
    @Body() body: { user_id?: string; hours?: number; notes?: string; logged_at?: string; category?: TaskTimeEntryCategory },
    @Req() req: any,
  ) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    // Verify entry belongs to task
    const entryTaskId = await this.timeEntriesSvc.getTaskIdForEntry(entryId, { manager: req?.queryRunner?.manager });
    if (entryTaskId !== taskId) {
      throw new BadRequestException('Time entry does not belong to this task');
    }

    const isAdmin = req?.isAdmin === true;
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
      isAdmin,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Delete(':taskId/time-entries/:entryId')
  async deleteTimeEntry(
    @Param('taskId') taskIdOrRef: string,
    @Param('entryId') entryId: string,
    @Req() req: any,
  ) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    // Verify entry belongs to task
    const entryTaskId = await this.timeEntriesSvc.getTaskIdForEntry(entryId, { manager: req?.queryRunner?.manager });
    if (entryTaskId !== taskId) {
      throw new BadRequestException('Time entry does not belong to this task');
    }

    await this.timeEntriesSvc.delete(entryId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
      isAdmin: req?.isAdmin === true,
    });
    return { success: true };
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':taskId/time-entries/sum')
  async getTimeSum(@Param('taskId') taskIdOrRef: string, @Req() req: any) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    const total = await this.timeEntriesSvc.sumForTask(taskId, { manager: req?.queryRunner?.manager });
    return { total };
  }

  // ==================== ACTIVITIES ====================

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':taskId/activities')
  async listActivities(@Param('taskId') taskIdOrRef: string, @Req() req: any) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    return this.activitiesSvc.listForTask(taskId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post(':taskId/activities')
  async createActivity(
    @Param('taskId') taskIdOrRef: string,
    @Body() body: ActivityBodyDto,
    @Req() req: any,
  ) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    const tenantId = req?.tenant?.id ?? '';
    if (body.type === 'unified') {
      return this.activitiesSvc.createUnified(taskId, body, tenantId, req.user?.sub ?? null, {
        manager: req?.queryRunner?.manager,
        isAdmin: req?.isAdmin === true,
      });
    }
    return this.activitiesSvc.create(taskId, body, tenantId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Patch(':taskId/activities/:activityId')
  async updateActivity(
    @Param('taskId') taskIdOrRef: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    const taskId = await this.resolveTaskId(taskIdOrRef, req);
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.activitiesSvc.updateComment(taskId, activityId, body?.content ?? '', userId, {
      manager: req?.queryRunner?.manager,
    });
  }
}
